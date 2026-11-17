import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeStatus } from './status.ts';

test('normalizeStatus maps known values and never invents ready', () => {
  assert.equal(normalizeStatus('READY'), 'ready');
  assert.equal(normalizeStatus('Building'), 'building');
  assert.equal(normalizeStatus('ERROR'), 'error');
  assert.equal(normalizeStatus('CANCELED'), 'canceled');
  assert.equal(normalizeStatus('queued'), 'queued');
  assert.equal(normalizeStatus('weird-platform-state'), 'unknown');
  assert.equal(normalizeStatus(''), 'unknown');
  assert.equal(normalizeStatus(null), 'unknown');
});
