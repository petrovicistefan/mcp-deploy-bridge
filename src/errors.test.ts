import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnsupportedError } from './errors.ts';

test('UnsupportedError names the platform and tool', () => {
  const err = new UnsupportedError('vercel', 'get_logs');
  assert.equal(err.code, 'unsupported');
  assert.equal(err.platform, 'vercel');
  assert.equal(err.tool, 'get_logs');
  assert.match(err.message, /vercel/);
  assert.match(err.message, /get_logs/);
  assert.ok(err instanceof Error);
});
