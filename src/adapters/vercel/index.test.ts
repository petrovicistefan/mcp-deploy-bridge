import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import type { CliResult } from '../../cli-runner.ts';
import { createVercelAdapter } from './index.ts';

const fixture = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/vercel/${name}`, import.meta.url), 'utf8');

function fakeRunCli(stdoutFor: (args: string[]) => string) {
  return async (_cmd: string, args: readonly string[]): Promise<CliResult> => {
    const list = [...args];
    return { stdout: stdoutFor(list), stderr: '', code: 0 };
  };
}

test('vercel adapter capabilities include deploy read/write tools', () => {
  const adapter = createVercelAdapter({
    runCli: fakeRunCli(() => '{}'),
  });
  assert.deepEqual(
    [...adapter.capabilities].sort(),
    [
      'get_deployment',
      'get_logs',
      'list_deployments',
      'list_targets',
      'redeploy',
      'rollback',
    ].sort(),
  );
});

test('list_targets reads .vercel/project.json without printing account details', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'mdb-vercel-'));
  await mkdir(join(cwd, '.vercel'));
  await writeFile(join(cwd, '.vercel', 'project.json'), fixture('project.json'));

  const adapter = createVercelAdapter({
    runCli: async (_cmd, args) => {
      if (args.includes('--version')) return { stdout: '65.17.0\n', stderr: '', code: 0 };
      if (args.includes('whoami')) return { stdout: fixture('whoami-signed-in.json'), stderr: '', code: 0 };
      return { stdout: '{}', stderr: '', code: 0 };
    },
  });

  const targets = await adapter.listTargets(cwd);
  assert.equal(targets.length, 1);
  assert.equal(targets[0]?.platform, 'vercel');
  assert.equal(targets[0]?.project, 'example-app');
  assert.equal(targets[0]?.cliInstalled, true);
  assert.equal(targets[0]?.signedIn, true);
  assert.equal(JSON.stringify(targets).includes('example'), true); // project name is fine
  assert.doesNotMatch(JSON.stringify(targets), /password|token|secret/i);
});

test('list/get/logs parse fixture CLI output', async () => {
  const adapter = createVercelAdapter({
    runCli: fakeRunCli((args) => {
      if (args[0] === 'list') return fixture('list.json');
      if (args[0] === 'inspect') return fixture('inspect.json');
      if (args[0] === 'logs') return fixture('logs.jsonl');
      return '{}';
    }),
  });

  const deps = await adapter.listDeployments({ project: 'example-app' });
  assert.equal(deps[0]?.status, 'ready');

  const detail = await adapter.getDeployment({ id: 'dpl_example_ready' });
  assert.match(detail.summary, /dpl_example_ready/);

  const logs = await adapter.getLogs({ id: 'dpl_example_ready' });
  assert.ok(logs.some((l) => l.message.includes('[REDACTED]')));
});

test('redeploy and rollback dry-run without confirm; execute with fixtures when confirmed', async () => {
  const adapter = createVercelAdapter({
    runCli: fakeRunCli((args) => {
      if (args[0] === 'redeploy') return fixture('redeploy.json');
      if (args[0] === 'rollback') return fixture('rollback.json');
      return '{}';
    }),
  });

  const dryRedeploy = await adapter.redeploy({ confirm: false, deploymentId: 'dpl_example_ready' });
  assert.equal(dryRedeploy.dryRun, true);
  assert.match(dryRedeploy.action, /Would rebuild/);
  assert.equal(dryRedeploy.deployment, null);

  const liveRedeploy = await adapter.redeploy({
    confirm: true,
    deploymentId: 'dpl_example_ready',
  });
  assert.equal(liveRedeploy.dryRun, false);
  assert.equal(liveRedeploy.deployment?.id, 'dpl_example_redeployed');
  assert.match(liveRedeploy.action, /Rebuilt and deployed/);

  const dryRollback = await adapter.rollback({ confirm: false, to: 'dpl_example_ready' });
  assert.equal(dryRollback.dryRun, true);
  assert.match(dryRollback.action, /Would roll back/);

  const liveRollback = await adapter.rollback({ confirm: true, to: 'dpl_example_ready' });
  assert.equal(liveRollback.dryRun, false);
  assert.match(liveRollback.action, /Rolled back|promoting/i);
  assert.equal(liveRollback.deployment?.id, 'dpl_example_ready');
});
