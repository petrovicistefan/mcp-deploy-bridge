import { UnsupportedError } from '../errors.js';
import type { ToolName } from '../types.js';
import type { Adapter } from './types.js';

/** Throw UnsupportedError when the adapter does not list the tool in capabilities. */
export function ensureSupported(adapter: Adapter, tool: ToolName): void {
  if (!adapter.capabilities.includes(tool)) {
    throw new UnsupportedError(adapter.platform, tool);
  }
}
