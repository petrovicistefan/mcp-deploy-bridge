# Cloudflare Workers adapter

Tested against **Wrangler 4.164.0** (`npx wrangler@4.164.0`).

## Commands used

| Tool | CLI | Notes |
|------|-----|-------|
| `list_targets` | `wrangler --version`, `wrangler whoami --json`, `wrangler.toml` / `wrangler.json(c)` | Only `signedIn` boolean — never returns email/account ids |
| `list_deployments` | `wrangler deployments list --json [--name]` | `id` = primary `version_id` (highest traffic %) so agents can pass it to rollback |
| `get_deployment` | `wrangler versions view <version-id> --json [--name]` | Plain-language summary of the Worker version |
| `get_logs` | `wrangler tail [--name] --format json [--version-id]` | **Bounded window**: process is killed after ~5s; partial stdout is parsed |
| `rollback` | `wrangler rollback <version-id> --yes [--name]` | **Publishes** that version as current traffic (does not rebuild) |
| `redeploy` | — | **Unsupported** — throws `UnsupportedError('cloudflare', 'redeploy')` |

## Write semantics

- **rollback**: points production traffic at an existing Worker **version** (`wrangler rollback`). Same family as `wrangler versions deploy <id>@100`.
- **redeploy**: not supported on this adapter (no silent no-op). Use the platform's deploy flow outside this tool, or ask for a Vercel target.

## Fixtures

`test/fixtures/cloudflare/` are scrubbed shapes from Wrangler unit-test snapshots and public docs. Not captured from a live Worker (no throwaway project used). `whoami` was verified to support `--json` on 4.164.0 locally; fixture emails/ids are examples only.

## Detection

Reads `name` from `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` in the cwd.
