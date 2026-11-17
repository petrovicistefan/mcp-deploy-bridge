import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { CliError, parseJsonOutput, runCli, type CliRunnerOptions } from '../../cli-runner.js';
import { redactDeep } from '../../redact.js';
import type {
  Deployment,
  DeploymentDetail,
  GetDeploymentInput,
  GetLogsInput,
  ListDeploymentsInput,
  LogLine,
  RedeployInput,
  RollbackInput,
  Target,
  ToolName,
  WriteResult,
} from '../../types.js';
import { ensureSupported } from '../ensure.js';
import type { Adapter } from '../types.js';
import { parseInspect, parseListDeployments, parseLogsJsonl, parseWriteResult } from './parse.js';

export const VERCEL_CLI_VERSION_TESTED = '65.17.0';

const CAPABILITIES = [
  'list_targets',
  'list_deployments',
  'get_deployment',
  'get_logs',
  'redeploy',
  'rollback',
] as const satisfies readonly ToolName[];

export type RunCliFn = typeof runCli;

export type VercelAdapterOptions = {
  runCli?: RunCliFn;
  /** Override binary name/path (default: vercel). */
  bin?: string;
};

type ProjectLink = {
  projectId?: string;
  orgId?: string;
  projectName?: string;
};

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readProjectLink(cwd: string): Promise<ProjectLink | null> {
  const path = join(cwd, '.vercel', 'project.json');
  if (!(await pathExists(path))) return null;
  try {
    const raw = JSON.parse(await readFile(path, 'utf8')) as ProjectLink;
    return raw;
  } catch {
    return null;
  }
}

export function createVercelAdapter(options: VercelAdapterOptions = {}): Adapter {
  const bin = options.bin ?? 'vercel';
  const exec: RunCliFn = options.runCli ?? runCli;

  async function vercel(args: string[], opts: CliRunnerOptions = {}) {
    return exec(bin, args, opts);
  }

  async function cliInstalled(): Promise<boolean> {
    try {
      await vercel(['--version'], { timeoutMs: 10_000 });
      return true;
    } catch (err) {
      if (err instanceof CliError && err.code === 'spawn') return false;
      // Non-zero from --version is still "installed".
      return err instanceof CliError;
    }
  }

  async function signedIn(cwd?: string): Promise<boolean> {
    try {
      const result = await vercel(['whoami', '--json', '--cached'], {
        cwd,
        timeoutMs: 15_000,
      });
      const body = parseJsonOutput<{ status?: string; username?: string }>(result.stdout);
      if (body.status === 'error') return false;
      return typeof body.username === 'string' || Object.keys(body).length > 0;
    } catch {
      return false;
    }
  }

  const adapter: Adapter = {
    platform: 'vercel',
    capabilities: CAPABILITIES,

    async listTargets(cwd: string): Promise<Target[]> {
      ensureSupported(adapter, 'list_targets');
      const link = await readProjectLink(cwd);
      const installed = await cliInstalled();
      const auth = installed ? await signedIn(cwd) : false;
      const project = link?.projectName ?? link?.projectId ?? null;
      if (!project && !installed) return [];
      return [
        redactDeep({
          platform: 'vercel' as const,
          project: project ?? '(no linked project)',
          cwd: link ? cwd : null,
          capabilities: CAPABILITIES,
          cliInstalled: installed,
          signedIn: auth,
        }),
      ];
    },

    async listDeployments(input: ListDeploymentsInput): Promise<Deployment[]> {
      ensureSupported(adapter, 'list_deployments');
      const args = ['list', '--json'];
      if (input.project) args.push(input.project);
      if (input.limit) args.push('--limit', String(input.limit));
      const result = await vercel(args, { cwd: input.cwd, timeoutMs: 60_000 });
      return parseListDeployments(result.stdout);
    },

    async getDeployment(input: GetDeploymentInput): Promise<DeploymentDetail> {
      ensureSupported(adapter, 'get_deployment');
      const result = await vercel(['inspect', input.id, '--json'], {
        cwd: input.cwd,
        timeoutMs: 60_000,
      });
      return parseInspect(result.stdout);
    },

    async getLogs(input: GetLogsInput): Promise<LogLine[]> {
      ensureSupported(adapter, 'get_logs');
      const args = ['logs', '--json', '--limit', String(input.limit ?? 100)];
      if (input.project) args.push('--project', input.project);
      if (input.id) args.push('--deployment', input.id);
      if (input.since) args.push('--since', input.since);
      if (input.until) args.push('--until', input.until);
      if (input.level && input.level !== 'unknown') {
        const qLevel = input.level === 'warn' ? 'warning' : input.level;
        args.push('--query', `level:${qLevel}`);
      }
      const result = await vercel(args, { cwd: input.cwd, timeoutMs: 60_000 });
      return parseLogsJsonl(result.stdout, input.level);
    },

    async redeploy(input: RedeployInput): Promise<WriteResult> {
      ensureSupported(adapter, 'redeploy');
      if (!input.confirm) {
        return {
          dryRun: true,
          action:
            'Would rebuild and deploy a previous Vercel deployment via `vercel redeploy` ' +
            `(deployment=${input.deploymentId ?? 'latest/required'}). No change made.`,
          deployment: null,
        };
      }
      if (!input.deploymentId) {
        throw new Error('redeploy requires deploymentId when confirm is true');
      }
      const result = await vercel(['redeploy', input.deploymentId, '--json', '--no-wait'], {
        cwd: input.cwd,
        timeoutMs: 120_000,
      });
      const parsed = parseWriteResult(
        result.stdout,
        'Rebuilt and deployed a previous Vercel deployment (vercel redeploy).',
      );
      return { dryRun: false, action: parsed.action, deployment: parsed.deployment };
    },

    async rollback(input: RollbackInput): Promise<WriteResult> {
      ensureSupported(adapter, 'rollback');
      if (!input.confirm) {
        return {
          dryRun: true,
          action:
            `Would roll back production to deployment ${input.to} via \`vercel rollback\` ` +
            '(promotes that deployment to current). No change made.',
          deployment: null,
        };
      }
      const result = await vercel(['rollback', input.to, '--json', '--yes'], {
        cwd: input.cwd,
        timeoutMs: 180_000,
      });
      const parsed = parseWriteResult(
        result.stdout,
        `Rolled back to deployment ${input.to} by promoting it to current (vercel rollback).`,
      );
      return { dryRun: false, action: parsed.action, deployment: parsed.deployment };
    },
  };

  return adapter;
}

/** Default singleton used by the server. */
export const vercelAdapter = createVercelAdapter();
