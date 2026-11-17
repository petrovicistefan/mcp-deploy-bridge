/** Platforms supported in v0.1. */
export type Platform = 'vercel' | 'cloudflare';

/** Normalized deployment status. Unknown CLI statuses map to `unknown`, never to `ready`. */
export type DeploymentStatus =
  | 'ready'
  | 'building'
  | 'error'
  | 'canceled'
  | 'queued'
  | 'unknown';

export type ToolName =
  | 'list_targets'
  | 'list_deployments'
  | 'get_deployment'
  | 'get_logs'
  | 'redeploy'
  | 'rollback';

export type Capability = ToolName;

export interface Deployment {
  id: string;
  platform: Platform;
  status: DeploymentStatus;
  commit: string | null;
  created: string;
  url: string | null;
  project: string | null;
}

export interface DeploymentDetail extends Deployment {
  /** Short build/runtime summary in plain words. */
  summary: string;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'unknown';

export interface LogLine {
  timestamp: string | null;
  level: LogLevel;
  message: string;
  source: 'build' | 'runtime' | 'unknown';
}

export interface Target {
  platform: Platform;
  project: string;
  /** Working directory where local config was found, if any. */
  cwd: string | null;
  capabilities: readonly Capability[];
  cliInstalled: boolean;
  /** True when the CLI reports an authenticated session. Never includes account details. */
  signedIn: boolean;
}

export interface ListDeploymentsInput {
  project?: string;
  cwd?: string;
  limit?: number;
}

export interface GetDeploymentInput {
  id: string;
  project?: string;
  cwd?: string;
}

export interface GetLogsInput {
  id?: string;
  project?: string;
  cwd?: string;
  /** ISO start bound; adapters may approximate with CLI flags. */
  since?: string;
  until?: string;
  level?: LogLevel;
  limit?: number;
}

export interface RedeployInput {
  project?: string;
  cwd?: string;
  deploymentId?: string;
  confirm: boolean;
}

export interface RollbackInput {
  project?: string;
  cwd?: string;
  /** Deployment or version id to restore. */
  to: string;
  confirm: boolean;
}

export interface WriteResult {
  /** What the platform actually did, in plain words (promote, republish, new deploy). */
  action: string;
  dryRun: boolean;
  deployment: Deployment | null;
}
