# Vercel adapter

Tested against **Vercel CLI 65.17.0** (`npx vercel@65.17.0`).

## Commands used

| Tool | CLI | Notes |
|------|-----|-------|
| `list_targets` | `vercel --version`, `vercel whoami --json --cached`, `.vercel/project.json` | Never returns account details — only `signedIn` boolean |
| `list_deployments` | `vercel list [project] --json [--limit N]` | Maps `state` → normalized status; unknown states → `unknown` |
| `get_deployment` | `vercel inspect <id\|url> --json` | Summary includes target and build readyState |
| `get_logs` | `vercel logs --json [--deployment] [--project] [--since] [--until] [--limit] [--query level:…]` | JSON Lines (`type=log` + trailing `summary`) |
| `redeploy` | `vercel redeploy <deployment> --json --no-wait` | **Rebuilds and deploys** a previous deployment (new deployment id) |
| `rollback` | `vercel rollback <deployment> --json --yes` | **Promotes** a previous deployment to current production |

## Write semantics (plain words)

- **redeploy**: creates a *new* deployment by rebuilding an existing one (`vercel redeploy`).
- **rollback**: does *not* rebuild; it **promotes** the named deployment to current (`vercel rollback`). Closely related to `vercel promote`.

## Fixtures

`test/fixtures/vercel/` are scrubbed JSON/JSONL shaped from the CLI 65.17.0 `--json` output (list/inspect source in vercel/vercel) and the public logs JSON Lines docs. They were **not** captured from a live project (local CLI was not signed in). Replace with live scrubbed captures when a throwaway project is available.

## Detection

Looks for `.vercel/project.json` (`projectName` / `projectId`). Reports whether `vercel` is on PATH and whether `whoami --json --cached` succeeds, without emitting username into tool results beyond the boolean `signedIn`.
