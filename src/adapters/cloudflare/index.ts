import { access, readFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join } from 'node:path';
import { CliError, parseJsonOutput, runCli, type CliRunnerOptions } from '../../cli-runner.js';
import { UnsupportedError } from '../../errors.js';
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
import {
  parseDeploymentsList,
  parseRollbackOutput,
  parseTailJsonl,
  parseVersionView,
  parseWorkerNameFromConfig,
} from './parse.js';

export const CLOUDFLARE_CLI_VERSION_TESTED = '4.164.0';

const CAPABILITIES = [
  'list_targets',
  'list_deployments',
  'get_deployment',
  'get_logs',
  'rollback',
] as const satisfies readonly ToolName[];

export type RunCliFn = typeof runCli;

export type CloudflareAdapterOptions = {
  runCli?: RunCliFn;
  bin?: string;
  /** Max time to collect `wrangler tail` output (bounded window). Default 5s. */
  tailTimeoutMs?: number;
};

const CONFIG_FILES = ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'] as const;

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readWorkerName(cwd: string): Promise<{ name: string; file: string } | null> {
  for (const file of CONFIG_FILES) {
    const path = join(cwd, file);
    if (!(await pathExists(path))) continue;
    const text = await readFile(path, 'utf8');
    const name = parseWorkerNameFromConfig(text, file);
    if (name) return { name, file };
  }
  return null;
}

export function createCloudflareAdapter(options: CloudflareAdapterOptions = {}): Adapter {
  const bin = options.bin ?? 'wrangler';
  const exec: RunCliFn = options.runCli ?? runCli;
  const tailTimeoutMs = options.tailTimeoutMs ?? 5_000;

  async function wrangler(args: string[], opts: CliRunnerOptions = {}) {
    return exec(bin, args, opts);
  }

  async function cliInstalled(): Promise<boolean> {
    try {
      await wrangler(['--version'], { timeoutMs: 10_000 });
      return true;
    } catch (err) {
      if (err instanceof CliError && err.code === 'spawn') return false;
      return err instanceof CliError;
    }
  }

  async function signedIn(cwd?: string): Promise<boolean> {
    try {
      const result = await wrangler(['whoami', '--json'], { cwd, timeoutMs: 20_000 });
      const body = parseJsonOutput<{ loggedIn?: boolean }>(result.stdout);
      return body.loggedIn === true;
    } catch {
      return false;
    }
  }

  const adapter: Adapter = {
    platform: 'cloudflare',
    capabilities: CAPABILITIES,

    async listTargets(cwd: string): Promise<Target[]> {
      ensureSupported(adapter, 'list_targets');
      const link = await readWorkerName(cwd);
      const installed = await cliInstalled();
      const auth = installed ? await signedIn(cwd) : false;
      if (!link && !installed) return [];
      return [
        redactDeep({
          platform: 'cloudflare' as const,
          project: link?.name ?? '(no wrangler config)',
          cwd: link ? cwd : null,
          capabilities: CAPABILITIES,
          cliInstalled: installed,
          signedIn: auth,
        }),
      ];
    },

    async listDeployments(input: ListDeploymentsInput): Promise<Deployment[]> {
      ensureSupported(adapter, 'list_deployments');
      const args = ['deployments', 'list', '--json'];
      if (input.project) args.push('--name', input.project);
      const result = await wrangler(args, { cwd: input.cwd, timeoutMs: 60_000 });
      return parseDeploymentsList(result.stdout, input.project ?? null);
    },

    async getDeployment(input: GetDeploymentInput): Promise<DeploymentDetail> {
      ensureSupported(adapter, 'get_deployment');
      const args = ['versions', 'view', input.id, '--json'];
      if (input.project) args.push('--name', input.project);
      const result = await wrangler(args, { cwd: input.cwd, timeoutMs: 60_000 });
      return parseVersionView(result.stdout, input.project ?? null);
    },

    async getLogs(input: GetLogsInput): Promise<LogLine[]> {
      ensureSupported(adapter, 'get_logs');
      const args = ['tail', '--format', 'json'];
      if (input.project) args.push(input.project);
      if (input.id) args.push('--version-id', input.id);
      try {
        const result = await wrangler(args, { cwd: input.cwd, timeoutMs: tailTimeoutMs });
        return parseTailJsonl(result.stdout, input.level);
      } catch (err) {
        // Bounded window: timeout is expected; parse whatever was collected.
        if (err instanceof CliError && err.code === 'timeout') {
          return parseTailJsonl(err.stdout, input.level);
        }
        throw err;
      }
    },

    async redeploy(_input: RedeployInput): Promise<WriteResult> {
      throw new UnsupportedError('cloudflare', 'redeploy');
    },

    async rollback(input: RollbackInput): Promise<WriteResult> {
      ensureSupported(adapter, 'rollback');
      if (!input.confirm) {
        return {
          dryRun: true,
          action:
            `Would publish previous Worker version ${input.to} as 100% traffic via \`wrangler rollback\`. ` +
            'No change made.',
          deployment: null,
        };
      }
      const args = ['rollback', input.to, '--yes'];
      if (input.project) args.push('--name', input.project);
      const result = await wrangler(args, { cwd: input.cwd, timeoutMs: 120_000 });
      const deployment = parseRollbackOutput(result.stdout, input.to);
      return {
        dryRun: false,
        action: `Published Worker version ${deployment.id} as current via wrangler rollback (repoints traffic; does not rebuild).`,
        deployment,
      };
    },
  };

  return adapter;
}

export const cloudflareAdapter = createCloudflareAdapter();
