import { getAdapter, listAdapters } from './adapters/registry.js';
import type { Adapter } from './adapters/types.js';
import type { Platform } from './types.js';

export function resolveAdapter(platform: Platform | undefined): Adapter {
  if (platform) {
    const adapter = getAdapter(platform);
    if (!adapter) throw new Error(`No adapter registered for platform "${platform}"`);
    return adapter;
  }
  const adapters = listAdapters();
  if (adapters.length === 1) return adapters[0]!;
  throw new Error(
    `platform is required when multiple adapters are registered (${adapters.map((a) => a.platform).join(', ') || 'none'})`,
  );
}
