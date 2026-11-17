import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  parseDeploymentsList,
  parseRollbackOutput,
  parseTailJsonl,
  parseVersionView,
  parseWorkerNameFromConfig,
} from './parse.ts';

const read = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/cloudflare/${name}`, import.meta.url), 'utf8');

test('parseDeploymentsList uses primary version_id as deployment id', () => {
  const deps = parseDeploymentsList(read('deployments-list.json'), 'example-worker');
  assert.equal(deps.length, 2);
  assert.equal(deps[1]?.id, '20000000-0000-0000-0000-000000000002');
  assert.equal(deps[1]?.status, 'ready');
  assert.equal(deps[1]?.project, 'example-worker');
});

test('parseVersionView builds a summary', () => {
  const detail = parseVersionView(read('versions-view.json'), 'example-worker');
  assert.equal(detail.id, '20000000-0000-0000-0000-000000000002');
  assert.match(detail.summary, /Cloudflare Worker version/);
  assert.equal(detail.commit, 'example-tag');
});

test('parseTailJsonl redacts secrets and maps levels', () => {
  const lines = parseTailJsonl(read('tail.jsonl'));
  assert.ok(lines.length >= 2);
  assert.ok(lines.some((l) => l.message.includes('[REDACTED]')));
  assert.doesNotMatch(JSON.stringify(lines), /cf_token_example/);
  assert.ok(lines.some((l) => l.level === 'error'));
});

test('parseRollbackOutput extracts version id', () => {
  const dep = parseRollbackOutput(read('rollback.txt'), 'fallback');
  assert.equal(dep.id, '10000000-0000-0000-0000-000000000001');
});

test('parseWorkerNameFromConfig reads toml and jsonc', () => {
  assert.equal(parseWorkerNameFromConfig(read('wrangler.toml'), 'wrangler.toml'), 'example-worker');
  assert.equal(
    parseWorkerNameFromConfig('{\n  // comment\n  "name": "json-worker"\n}\n', 'wrangler.jsonc'),
    'json-worker',
  );
});
