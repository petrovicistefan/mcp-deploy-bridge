import type { Platform } from '../types.js';
import type { Adapter } from './types.js';

const adapters = new Map<Platform, Adapter>();

export function registerAdapter(adapter: Adapter): void {
  adapters.set(adapter.platform, adapter);
}

export function getAdapter(platform: Platform): Adapter | undefined {
  return adapters.get(platform);
}

export function listAdapters(): Adapter[] {
  return [...adapters.values()];
}

/** Test helper: wipe the registry. */
export function clearAdapters(): void {
  adapters.clear();
}
