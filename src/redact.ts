/**
 * Scrub secrets from CLI text before it reaches a tool result.
 * M5 expands patterns; adapters must call this on all CLI-derived strings.
 */
const PATTERNS: RegExp[] = [
  // Common bearer / token shapes
  /\b(?:vercel_|Bearer\s+)[A-Za-z0-9._\-]{8,}\b/gi,
  /\b(?:api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[^\s'"]+/gi,
  // npm / GitHub style tokens
  /\b(?:ghp_|gho_|github_pat_|npm_)[A-Za-z0-9_]+\b/g,
];

export function redact(text: string): string {
  let out = text;
  for (const pattern of PATTERNS) {
    out = out.replace(pattern, '[REDACTED]');
  }
  return out;
}

export function redactDeep<T>(value: T): T {
  if (typeof value === 'string') return redact(value) as T;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      out[key] = redactDeep(child);
    }
    return out as T;
  }
  return value;
}
