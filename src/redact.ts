/**
 * Scrub secrets and environment values from CLI text before tool results.
 * Adapters must run all CLI-derived strings through `redact` / `redactDeep`.
 */
const PATTERNS: RegExp[] = [
  // Explicit secret assignments / headers
  /\b(?:api[_-]?key|token|secret|password|passwd|authorization|credential)\s*[:=]\s*['"]?[^\s'"]+/gi,
  /\bBearer\s+[A-Za-z0-9._\-+=\/]{8,}/gi,
  // Platform / cloud token prefixes
  /\b(?:vercel_|ghp_|gho_|github_pat_|npm_|cfar_|sk_live_|sk_test_|AKIA)[A-Za-z0-9._\-]*/g,
  // DB/message URLs, and http(s) URLs that embed user:pass@
  /\b(?:postgres|postgresql|mysql|mongodb|redis|amqp):\/\/[^\s'"]+/gi,
  /\bhttps?:\/\/[^/\s'"]+:[^/\s'"]+@[^\s'"]+/gi,
  // Common env var dumps: NAME=value for sensitive names
  /\b(?:DATABASE_URL|DIRECT_URL|REDIS_URL|API_KEY|SECRET_KEY|ACCESS_TOKEN|PRIVATE_KEY|CF_API_TOKEN|VERCEL_TOKEN|AWS_SECRET_ACCESS_KEY)\s*=\s*[^\s'"]+/gi,
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
