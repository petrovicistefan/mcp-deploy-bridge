import { spawn } from 'node:child_process';

export type CliRunnerOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  /** Kill the process after this many milliseconds. Default 60_000. */
  timeoutMs?: number;
};

export type CliResult = {
  stdout: string;
  stderr: string;
  code: number;
};

export class CliError extends Error {
  readonly code: 'timeout' | 'exit' | 'spawn';
  readonly exitCode: number | null;
  readonly stdout: string;
  readonly stderr: string;

  constructor(
    message: string,
    code: 'timeout' | 'exit' | 'spawn',
    exitCode: number | null = null,
    stdout = '',
    stderr = '',
  ) {
    super(message);
    this.name = 'CliError';
    this.code = code;
    this.exitCode = exitCode;
    this.stdout = stdout;
    this.stderr = stderr;
  }
}

/** Parse CLI stdout as JSON. Throws if the payload is not valid JSON. */
export function parseJsonOutput<T>(stdout: string): T {
  const trimmed = stdout.trim();
  if (!trimmed) throw new Error('CLI produced empty stdout; expected JSON');
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    throw new Error('CLI stdout was not valid JSON');
  }
}

/**
 * Spawn a CLI with an argument array (never a shell string).
 * Collects stdout/stderr and enforces a timeout.
 */
export function runCli(
  command: string,
  args: readonly string[],
  options: CliRunnerOptions = {},
): Promise<CliResult> {
  const timeoutMs = options.timeoutMs ?? 60_000;

  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);

    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', (err) => {
      finish(() => {
        reject(new CliError(`Failed to spawn ${command}: ${err.message}`, 'spawn', null, stdout, stderr));
      });
    });

    child.on('close', (code) => {
      finish(() => {
        if (timedOut) {
          reject(
            new CliError(`CLI timed out after ${timeoutMs}ms: ${command}`, 'timeout', null, stdout, stderr),
          );
          return;
        }
        const exitCode = code ?? 1;
        if (exitCode !== 0) {
          reject(
            new CliError(
              `CLI exited with code ${exitCode}: ${command}`,
              'exit',
              exitCode,
              stdout,
              stderr,
            ),
          );
          return;
        }
        resolve({ stdout, stderr, code: exitCode });
      });
    });
  });
}
