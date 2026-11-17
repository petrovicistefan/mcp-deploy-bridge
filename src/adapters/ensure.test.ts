import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnsupportedError } from '../errors.ts';
import type { Adapter } from './types.ts';
import { ensureSupported } from './ensure.ts';

function fakeAdapter(capabilities: Adapter['capabilities']): Adapter {
  return {
    platform: 'vercel',
    capabilities,
    async listTargets() {
      return [];
    },
    async listDeployments() {
      return [];
    },
    async getDeployment() {
      throw new UnsupportedError('vercel', 'get_deployment');
    },
    async getLogs() {
      throw new UnsupportedError('vercel', 'get_logs');
    },
    async redeploy() {
      throw new UnsupportedError('vercel', 'redeploy');
    },
    async rollback() {
      throw new UnsupportedError('vercel', 'rollback');
    },
  };
}

test('ensureSupported allows listed capabilities', () => {
  const adapter = fakeAdapter(['list_targets', 'list_deployments']);
  assert.doesNotThrow(() => ensureSupported(adapter, 'list_deployments'));
});

test('ensureSupported throws UnsupportedError for missing tools', () => {
  const adapter = fakeAdapter(['list_targets']);
  assert.throws(
    () => ensureSupported(adapter, 'rollback'),
    (err: unknown) => {
      assert.ok(err instanceof UnsupportedError);
      assert.equal(err.platform, 'vercel');
      assert.equal(err.tool, 'rollback');
      return true;
    },
  );
});
