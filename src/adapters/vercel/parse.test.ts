import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseInspect, parseListDeployments, parseLogsJsonl, parseWriteResult } from './parse.ts';

const read = (name: string) =>
  readFileSync(new URL(`../../../test/fixtures/vercel/${name}`, import.meta.url), 'utf8');

test('parseListDeployments maps READY/BUILDING and unknown BLOCKED', () => {
  const deps = parseListDeployments(read('list.json'));
  assert.equal(deps.length, 3);
  assert.equal(deps[0]?.status, 'ready');
  assert.equal(deps[0]?.id, 'dpl_example_ready');
  assert.equal(deps[0]?.commit, 'abc123examplecommitsha000000000000000001');
  assert.equal(deps[1]?.status, 'building');
  assert.equal(deps[2]?.status, 'unknown');
  assert.match(deps[0]?.url ?? '', /^https:\/\//);
});

test('parseInspect builds a plain-language summary', () => {
  const detail = parseInspect(read('inspect.json'));
  assert.equal(detail.id, 'dpl_example_ready');
  assert.equal(detail.status, 'ready');
  assert.match(detail.summary, /production/);
  assert.match(detail.summary, /READY|ready/i);
});

test('parseLogsJsonl maps levels and redacts token-like text', () => {
  const lines = parseLogsJsonl(read('logs.jsonl'));
  assert.equal(lines.length, 3);
  assert.equal(lines[0]?.level, 'info');
  assert.equal(lines[1]?.level, 'error');
  assert.match(lines[1]?.message ?? '', /\[REDACTED\]/);
  assert.doesNotMatch(lines[1]?.message ?? '', /vercel_token_example/);
  const errorsOnly = parseLogsJsonl(read('logs.jsonl'), 'error');
  assert.equal(errorsOnly.length, 1);
});

test('parseWriteResult maps redeploy fixture', () => {
  const result = parseWriteResult(read('redeploy.json'), 'Rebuilt and deployed a previous Vercel deployment');
  assert.equal(result.deployment.id, 'dpl_example_redeployed');
  assert.equal(result.deployment.status, 'building');
  assert.match(result.action, /Rebuilt/);
});
