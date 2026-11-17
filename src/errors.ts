/** Thrown when an adapter does not support a tool. Never return an empty success instead. */
export class UnsupportedError extends Error {
  readonly code = 'unsupported' as const;
  readonly platform: string;
  readonly tool: string;

  constructor(platform: string, tool: string) {
    super(`Platform "${platform}" does not support tool "${tool}"`);
    this.name = 'UnsupportedError';
    this.platform = platform;
    this.tool = tool;
  }
}
