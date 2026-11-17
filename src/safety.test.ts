import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCloudflareAdapter } from './adapters/cloudflare/index.ts';
import { createVercelAdapter } from './adapters/vercel/index.ts';
import { redact } from './redact.ts';

test('redact removes env values and connection strings from CLI-like output', () => {
  const blob = [
    'DATABASE_URL=postgres://user:hunter2@db.example.com:5432/app',
    'CF_API_TOKEN=cfar_example_secret_value',
    'VERCEL_TOKEN=vercel_token_example_value',
    'Authorization: Bearer sk_live_example_secret',
    'safe message without secrets',
  ].join('\n');
  const cleaned = redact(blob);
  assert.doesNotMatch(cleaned, /hunter2/);
  assert.doesNotMatch(cleaned, /cfar_example/);
  assert.doesNotMatch(cleaned, /vercel_token_example/);
  assert.doesNotMatch(cleaned, /sk_live_example/);
  assert.match(cleaned, /safe message without secrets/);
  assert.match(cleaned, /\[REDACTED\]/);
});

test('redeploy confirm gate: dry-run without confirm, executes only when confirm true', async () => {
  let called = false;
  const adapter = createVercelAdapter({
    runCli: async (_cmd, args) => {
      if (args[0] === 'redeploy') {
        called = true;
        return {
          stdout: JSON.stringify({
            id: 'dpl_new',
            name: 'example-app',
            url: 'example.vercel.app',
            readyState: 'BUILDING',
            createdAt: 1,
          }),
          stderr: '',
          code: 0,
        };
      }
      return { stdout: '{}', stderr: '', code: 0 };
    },
  });

  const dry = await adapter.redeploy({ confirm: false, deploymentId: 'dpl_old' });
  assert.equal(dry.dryRun, true);
  assert.equal(called, false);

  const live = await adapter.redeploy({ confirm: true, deploymentId: 'dpl_old' });
  assert.equal(live.dryRun, false);
  assert.equal(called, true);
  assert.equal(live.deployment?.id, 'dpl_new');
});

test('rollback confirm gate on both adapters', async () => {
  let vercelCalled = false;
  let cfCalled = false;

  const vercel = createVercelAdapter({
    runCli: async (_cmd, args) => {
      if (args[0] === 'rollback') {
        vercelCalled = true;
        return {
          stdout: JSON.stringify({
            id: 'dpl_prev',
            name: 'example-app',
            url: 'example.vercel.app',
            readyState: 'READY',
            createdAt: 1,
          }),
          stderr: '',
          code: 0,
        };
      }
      return { stdout: '{}', stderr: '', code: 0 };
    },
  });

  const cloudflare = createCloudflareAdapter({
    runCli: async (_cmd, args) => {
      if (args[0] === 'rollback') {
        cfCalled = true;
        return {
          stdout: 'Successfully rolled back to Version ID: 10000000-0000-0000-0000-000000000001\n',
          stderr: '',
          code: 0,
        };
      }
      return { stdout: '{}', stderr: '', code: 0 };
    },
  });

  assert.equal((await vercel.rollback({ confirm: false, to: 'dpl_prev' })).dryRun, true);
  assert.equal(vercelCalled, false);
  assert.equal((await vercel.rollback({ confirm: true, to: 'dpl_prev' })).dryRun, false);
  assert.equal(vercelCalled, true);

  assert.equal(
    (await cloudflare.rollback({ confirm: false, to: '10000000-0000-0000-0000-000000000001' }))
      .dryRun,
    true,
  );
  assert.equal(cfCalled, false);
  assert.equal(
    (await cloudflare.rollback({ confirm: true, to: '10000000-0000-0000-0000-000000000001' }))
      .dryRun,
    false,
  );
  assert.equal(cfCalled, true);
});
