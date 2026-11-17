import { test } from 'node:test';
import assert from 'node:assert/strict';
import { redact, redactDeep } from './redact.ts';

test('redact strips token-like substrings', () => {
  assert.match(redact('token=vercel_token_example_abc'), /\[REDACTED\]/);
  assert.doesNotMatch(redact('Bearer sk_live_example_value_here'), /sk_live/);
  assert.equal(redact('hello world'), 'hello world');
});

test('redact strips env assignments and database URLs', () => {
  assert.doesNotMatch(redact('DATABASE_URL=postgres://u:p@host/db'), /postgres:\/\//);
  assert.doesNotMatch(redact('CF_API_TOKEN=abc123secret'), /abc123secret/);
  assert.match(redact('status=ok'), /status=ok/);
});

test('redactDeep walks objects', () => {
  const out = redactDeep({ message: 'api_key=supersecretvalue', ok: true });
  assert.match(out.message, /\[REDACTED\]/);
  assert.equal(out.ok, true);
});
