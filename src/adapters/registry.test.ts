import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UnsupportedError } from '../errors.ts';
import type { Adapter } from './types.ts';
import { clearAdapters, getAdapter, listAdapters, registerAdapter } from './registry.ts';

function stub(platform: Adapter['platform']): Adapter {
  return {
    platform,
    capabilities: ['list_targets'],
    async listTargets() {
      return [];
    },
    async listDeployments() {
      throw new UnsupportedError(platform, 'list_deployments');
    },
    async getDeployment() {
      throw new UnsupportedError(platform, 'get_deployment');
    },
    async getLogs() {
      throw new UnsupportedError(platform, 'get_logs');
    },
    async redeploy() {
      throw new UnsupportedError(platform, 'redeploy');
    },
    async rollback() {
      throw new UnsupportedError(platform, 'rollback');
    },
  };
}

test('adapter registry stores and lists adapters by platform', () => {
  clearAdapters();
  registerAdapter(stub('vercel'));
  registerAdapter(stub('cloudflare'));
  assert.equal(getAdapter('vercel')?.platform, 'vercel');
  assert.equal(listAdapters().length, 2);
  clearAdapters();
  assert.equal(listAdapters().length, 0);
});
