import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { UnsupportedError } from '../../errors.ts';
import type { CliResult } from '../../cli-runner.ts';
import { CliError } from '../../cli-runner.ts';
import { createCloudflareAdapter } from './index.ts';

const fixture = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/cloudflare/${name}`, import.meta.url), 'utf8');

test('cloudflare capabilities exclude redeploy', () => {
  const adapter = createCloudflareAdapter({
    runCli: async () => ({ stdout: '[]', stderr: '', code: 0 }),
  });
  assert.ok(!adapter.capabilities.includes('redeploy'));
  assert.ok(adapter.capabilities.includes('rollback'));
});

test('redeploy throws UnsupportedError naming cloudflare', async () => {
  const adapter = createCloudflareAdapter({
    runCli: async () => ({ stdout: '', stderr: '', code: 0 }),
  });
  await assert.rejects(
    () => adapter.redeploy({ confirm: true }),
    (err: unknown) => {
      assert.ok(err instanceof UnsupportedError);
      assert.equal(err.platform, 'cloudflare');
      assert.equal(err.tool, 'redeploy');
      return true;
    },
  );
});

test('list_targets reads wrangler.toml without leaking account details', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'mdb-cf-'));
  await writeFile(join(cwd, 'wrangler.toml'), fixture('wrangler.toml'));

  const adapter = createCloudflareAdapter({
    runCli: async (_cmd, args) => {
      if (args.includes('--version') || args[0] === '--version') {
        return { stdout: '4.164.0\n', stderr: '', code: 0 };
      }
      if (args.includes('whoami')) return { stdout: fixture('whoami.json'), stderr: '', code: 0 };
      return { stdout: '[]', stderr: '', code: 0 };
    },
  });

  const targets = await adapter.listTargets(cwd);
  assert.equal(targets[0]?.project, 'example-worker');
  assert.equal(targets[0]?.signedIn, true);
  assert.doesNotMatch(JSON.stringify(targets), /petrovici|@gmail\.com|9e447dea/i);
});

test('list/get/logs/rollback use fixtures; tail timeout still parses stdout', async () => {
  const adapter = createCloudflareAdapter({
    tailTimeoutMs: 50,
    runCli: async (_cmd, args): Promise<CliResult> => {
      if (args[0] === 'deployments' && args[1] === 'list') {
        return { stdout: fixture('deployments-list.json'), stderr: '', code: 0 };
      }
      if (args[0] === 'versions' && args[1] === 'view') {
        return { stdout: fixture('versions-view.json'), stderr: '', code: 0 };
      }
      if (args[0] === 'tail') {
        throw new CliError('timeout', 'timeout', null, fixture('tail.jsonl'), '');
      }
      if (args[0] === 'rollback') {
        return { stdout: fixture('rollback.txt'), stderr: '', code: 0 };
      }
      return { stdout: '{}', stderr: '', code: 0 };
    },
  });

  const deps = await adapter.listDeployments({ project: 'example-worker' });
  assert.equal(deps[1]?.id, '20000000-0000-0000-0000-000000000002');

  const detail = await adapter.getDeployment({
    id: '20000000-0000-0000-0000-000000000002',
    project: 'example-worker',
  });
  assert.match(detail.summary, /Worker version/);

  const logs = await adapter.getLogs({ project: 'example-worker' });
  assert.ok(logs.some((l) => l.message.includes('[REDACTED]')));

  const dry = await adapter.rollback({ confirm: false, to: '10000000-0000-0000-0000-000000000001' });
  assert.equal(dry.dryRun, true);

  const live = await adapter.rollback({ confirm: true, to: '10000000-0000-0000-0000-000000000001' });
  assert.equal(live.dryRun, false);
  assert.match(live.action, /Published Worker version/);
  assert.equal(live.deployment?.id, '10000000-0000-0000-0000-000000000001');
});
