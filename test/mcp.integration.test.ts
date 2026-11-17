import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const readJson = (path: string) => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

test('stdio initialize, tools/list and list_targets', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['dist/server.js'],
  });
  const client = new Client({ name: 'deploy-bridge-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const pkg = readJson('../package.json');
    const manifest = readJson('../server.json');
    assert.equal(client.getServerVersion()?.version, pkg.version);
    assert.equal(manifest.version, pkg.version);

    const { tools } = await client.listTools();
    assert.deepEqual(
      tools.map((t) => t.name).sort(),
      ['list_targets'],
    );

    const result = await client.callTool({ name: 'list_targets', arguments: {} });
    assert.equal(result.isError, undefined);
    const text = (result.content as Array<{ type: string; text: string }>)[0]?.text;
    assert.ok(text);
    assert.deepEqual(JSON.parse(text), { targets: [] });
  } finally {
    await client.close();
  }
});
