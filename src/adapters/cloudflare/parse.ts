import { redact, redactDeep } from '../../redact.js';
import type { Deployment, DeploymentDetail, LogLevel, LogLine } from '../../types.js';

type RawVersionTraffic = { version_id?: string; percentage?: number };

type RawDeployment = {
  id?: string;
  created_on?: string;
  source?: string;
  author_email?: string;
  annotations?: Record<string, string>;
  versions?: RawVersionTraffic[];
};

type RawVersionView = {
  id?: string;
  number?: number;
  metadata?: { created_on?: string; source?: string };
  annotations?: Record<string, string>;
};

function primaryVersion(versions: RawVersionTraffic[] | undefined): RawVersionTraffic | null {
  if (!versions?.length) return null;
  return [...versions].sort((a, b) => (b.percentage ?? 0) - (a.percentage ?? 0))[0] ?? null;
}

export function parseDeploymentsList(stdout: string, project: string | null): Deployment[] {
  const raw = JSON.parse(stdout) as RawDeployment[];
  if (!Array.isArray(raw)) throw new Error('wrangler deployments list --json expected an array');
  return raw.map((dep) => {
    const primary = primaryVersion(dep.versions);
    return redactDeep({
      id: String(primary?.version_id ?? dep.id ?? ''),
      platform: 'cloudflare' as const,
      // Deployments returned by wrangler are already published; traffic split ≠ building.
      status: 'ready' as const,
      commit: null,
      created: dep.created_on ?? new Date(0).toISOString(),
      url: null,
      project,
    });
  });
}

export function parseVersionView(stdout: string, project: string | null): DeploymentDetail {
  const raw = JSON.parse(stdout) as RawVersionView;
  const tag = raw.annotations?.['workers/tag'];
  const message = raw.annotations?.['workers/message'];
  const deployment = redactDeep({
    id: String(raw.id ?? ''),
    platform: 'cloudflare' as const,
    status: 'ready' as const,
    commit: tag ?? null,
    created: raw.metadata?.created_on ?? new Date(0).toISOString(),
    url: null,
    project,
  });
  const summary = redact(
    `Cloudflare Worker version ${deployment.id}` +
      (typeof raw.number === 'number' ? ` (#${raw.number})` : '') +
      ` is ready` +
      (message ? `; message=${message}` : ''),
  );
  return { ...deployment, summary };
}

function mapLevel(raw: string | undefined): LogLevel {
  switch ((raw ?? '').toLowerCase()) {
    case 'info':
    case 'log':
      return 'info';
    case 'warn':
    case 'warning':
      return 'warn';
    case 'error':
    case 'fatal':
      return 'error';
    case 'debug':
      return 'debug';
    default:
      return 'unknown';
  }
}

export function parseTailJsonl(stdout: string, levelFilter?: LogLevel): LogLine[] {
  const lines: LogLine[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let event: {
      Outcome?: string;
      Logs?: Array<{ Level?: string; Message?: unknown[]; TimestampMs?: number }>;
      Exceptions?: Array<{ Message?: string }>;
      EventTimestampMs?: number;
    };
    try {
      event = JSON.parse(trimmed) as typeof event;
    } catch {
      continue;
    }
    for (const log of event.Logs ?? []) {
      const level = mapLevel(log.Level);
      if (levelFilter && levelFilter !== 'unknown' && level !== levelFilter) continue;
      const message = redact(
        Array.isArray(log.Message) ? log.Message.map(String).join(' ') : String(log.Message ?? ''),
      );
      lines.push({
        timestamp: typeof log.TimestampMs === 'number' ? new Date(log.TimestampMs).toISOString() : null,
        level,
        message,
        source: 'runtime',
      });
    }
    for (const ex of event.Exceptions ?? []) {
      if (levelFilter && levelFilter !== 'error' && levelFilter !== 'unknown') continue;
      lines.push({
        timestamp:
          typeof event.EventTimestampMs === 'number'
            ? new Date(event.EventTimestampMs).toISOString()
            : null,
        level: 'error',
        message: redact(String(ex.Message ?? 'exception')),
        source: 'runtime',
      });
    }
  }
  return lines;
}

export function parseRollbackOutput(stdout: string, versionId: string): Deployment {
  const match = stdout.match(/Version ID:\s*([0-9a-f-]{36})/i);
  const id = match?.[1] ?? versionId;
  return redactDeep({
    id,
    platform: 'cloudflare' as const,
    status: 'ready' as const,
    commit: null,
    created: new Date().toISOString(),
    url: null,
    project: null,
  });
}

/** Minimal TOML/JSONC name extraction without adding a parser dependency. */
export function parseWorkerNameFromConfig(text: string, filename: string): string | null {
  if (filename.endsWith('.toml')) {
    const match = text.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
    return match?.[1] ?? null;
  }
  // wrangler.json / wrangler.jsonc — strip simple // comments then JSON.parse
  const stripped = text.replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  try {
    const json = JSON.parse(stripped) as { name?: string };
    return typeof json.name === 'string' ? json.name : null;
  } catch {
    return null;
  }
}
