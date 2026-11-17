import type {
  Deployment,
  DeploymentDetail,
  GetDeploymentInput,
  GetLogsInput,
  ListDeploymentsInput,
  LogLine,
  Platform,
  RedeployInput,
  RollbackInput,
  Target,
  ToolName,
  WriteResult,
} from '../types.js';

/**
 * Per-platform adapter. Unsupported tools must throw UnsupportedError(platform, tool).
 * Spawn only through src/cli-runner.ts.
 */
export interface Adapter {
  readonly platform: Platform;
  readonly capabilities: readonly ToolName[];

  listTargets(cwd: string): Promise<Target[]>;
  listDeployments(input: ListDeploymentsInput): Promise<Deployment[]>;
  getDeployment(input: GetDeploymentInput): Promise<DeploymentDetail>;
  getLogs(input: GetLogsInput): Promise<LogLine[]>;
  redeploy(input: RedeployInput): Promise<WriteResult>;
  rollback(input: RollbackInput): Promise<WriteResult>;
}
