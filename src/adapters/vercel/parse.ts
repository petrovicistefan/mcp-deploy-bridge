import { redact, redactDeep } from '../../redact.js';
import { normalizeStatus } from '../../status.js';
import type { Deployment, DeploymentDetail, LogLevel, LogLine } from '../../types.js';

type RawMeta = Record<string, unknown> | undefined;

type RawDeployment = {
  id?: string;
  url?: string;
  name?: string;
  state?: string;
  readyState?: string;
  createdAt?: number;
  target?: string;
  aliases?: string[];
  builds?: Array<{ readyState?: string }>;
  meta?: RawMeta;
};

type RawList = {
  deployments?: RawDeployment[];
};

function isoFromMs(ms: number | undefined): string {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return new Date(0).toISOString();
  return new Date(ms).toISOString();
}

function commitFromMeta(meta: RawMeta): string | null {
  if (!meta) return null;
  const sha = meta.githubCommitSha ?? meta.gitCommitSha ?? meta.commit;
  return typeof sha === 'string' && sha.length > 0 ? sha : null;
}

function mapDeployment(raw: RawDeployment, stateField: string | undefined): Deployment {
  const url = raw.url ? (raw.url.startsWith('http') ? raw.url : `https://${raw.url}`) : null;
  return redactDeep({
    id: String(raw.id ?? ''),
    platform: 'vercel' as const,
    status: normalizeStatus(stateField),
    commit: commitFromMeta(raw.meta),
    created: isoFromMs(raw.createdAt),
    url,
    project: typeof raw.name === 'string' ? raw.name : null,
  });
}

export function parseListDeployments(stdout: string): Deployment[] {
  const data = JSON.parse(stdout) as RawList;
  return (data.deployments ?? []).map((dep) => mapDeployment(dep, dep.state));
}

export function parseInspect(stdout: string): DeploymentDetail {
  const raw = JSON.parse(stdout) as RawDeployment;
  const deployment = mapDeployment(raw, raw.readyState);
  const target = typeof raw.target === 'string' ? raw.target : 'unknown';
  const buildState = raw.builds?.[0]?.readyState;
  const aliases = raw.aliases?.length ? ` aliases=${raw.aliases.join(',')}` : '';
  const summary = redact(
    `Vercel deployment ${deployment.id} is ${deployment.status} (target=${target}` +
      (buildState ? `, build=${buildState}` : '') +
      `)${aliases}`,
  );
  return { ...deployment, summary };
}

function mapLogLevel(raw: string | undefined): LogLevel {
  switch ((raw ?? '').toLowerCase()) {
    case 'info':
      return 'info';
    case 'warning':
    case 'warn':
      return 'warn';
    case 'error':
    case 'fatal':
      return 'error';
    case 'debug':
    case 'trace':
      return 'debug';
    default:
      return 'unknown';
  }
}

export function parseLogsJsonl(stdout: string, levelFilter?: LogLevel): LogLine[] {
  const lines: LogLine[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let parsed: { type?: string; data?: Record<string, unknown> };
    try {
      parsed = JSON.parse(trimmed) as { type?: string; data?: Record<string, unknown> };
    } catch {
      continue;
    }
    if (parsed.type !== 'log' || !parsed.data) continue;
    const level = mapLogLevel(typeof parsed.data.level === 'string' ? parsed.data.level : undefined);
    if (levelFilter && levelFilter !== 'unknown' && level !== levelFilter) continue;
    const ts =
      typeof parsed.data.timestampInMs === 'number'
        ? new Date(parsed.data.timestampInMs).toISOString()
        : null;
    const message = redact(String(parsed.data.message ?? ''));
    lines.push({
      timestamp: ts,
      level,
      message,
      source: 'runtime',
    });
  }
  return lines;
}

export function parseWriteResult(stdout: string, action: string): { action: string; deployment: Deployment } {
  const raw = JSON.parse(stdout) as RawDeployment;
  const deployment = mapDeployment(raw, raw.readyState ?? raw.state);
  return { action: redact(action), deployment };
}
