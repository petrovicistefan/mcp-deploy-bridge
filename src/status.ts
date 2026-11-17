import type { DeploymentStatus } from './types.js';

/**
 * Map a raw platform status string to the normalized set.
 * Anything unrecognized becomes `unknown` — never `ready`.
 */
export function normalizeStatus(raw: string | null | undefined): DeploymentStatus {
  if (!raw) return 'unknown';
  const key = raw.trim().toLowerCase().replace(/[\s_]+/g, '-');
  switch (key) {
    case 'ready':
    case 'success':
    case 'succeeded':
    case 'active':
    case 'current':
    case 'deployed':
      return 'ready';
    case 'building':
    case 'build':
    case 'deploying':
    case 'in-progress':
    case 'progressing':
    case 'running':
      return 'building';
    case 'error':
    case 'failed':
    case 'failure':
    case 'errored':
      return 'error';
    case 'canceled':
    case 'cancelled':
    case 'aborted':
      return 'canceled';
    case 'queued':
    case 'pending':
    case 'waiting':
    case 'initializing':
      return 'queued';
    default:
      return 'unknown';
  }
}
