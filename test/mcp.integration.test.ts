import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('stdio initialize, tools/list, list_targets and write dry-runs', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/server.js'],
  });
  const client = new Client({ name: 'deploy-bridge-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const pkg = readJson('../package.json');
    assert.equal(client.getServerVersion()?.version, pkg.version);

    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      [
        'get_deployment',
        'get_logs',
        'list_deployments',
        'list_targets',
        'redeploy',
        'rollback',
      ].sort(),
    );

    const write = tools.filter((t) => t.name === 'redeploy' || t.name === 'rollback');
    for (const tool of write) {
      assert.equal(tool.annotations?.destructiveHint, true);
    }

    const targets = await client.callTool({ name: 'list_targets', arguments: {} });
    assert.equal(targets.isError, undefined);

    const dryRedeploy = await client.callTool({
      name: 'redeploy',
      arguments: { platform: 'vercel', deploymentId: 'dpl_example', confirm: false },
    });
    assert.equal(dryRedeploy.isError, undefined);
    const redeployText = (dryRedeploy.content as Array<{ text: string }>)[0]?.text ?? '';
    assert.match(redeployText, /Would rebuild|"dryRun":true/);

    const cfRedeploy = await client.callTool({
      name: 'redeploy',
      arguments: { platform: 'cloudflare', confirm: false },
    });
    assert.equal(cfRedeploy.isError, undefined);
    assert.match(
      (cfRedeploy.content as Array<{ text: string }>)[0]?.text ?? '',
      /Would upload|"dryRun":true/,
    );

    const dryRollback = await client.callTool({
      name: 'rollback',
      arguments: { platform: 'vercel', to: 'dpl_example', confirm: false },
    });
    assert.equal(dryRollback.isError, undefined);
    const rollbackText = (dryRollback.content as Array<{ text: string }>)[0]?.text ?? '';
    assert.match(rollbackText, /Would roll back|"dryRun":true/);

    const cfDryRollback = await client.callTool({
      name: 'rollback',
      arguments: {
        platform: 'cloudflare',
        to: '10000000-0000-0000-0000-000000000001',
        confirm: false,
      },
    });
    assert.equal(cfDryRollback.isError, undefined);
    assert.match(
      (cfDryRollback.content as Array<{ text: string }>)[0]?.text ?? '',
      /Would publish|"dryRun":true/,
    );
  } finally {
    await client.close();
  }
});
