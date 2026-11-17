# Cloudflare Workers adapter

Tested against **Wrangler 4.164.0** (`npx wrangler@4.164.0`).

## Commands used

| Tool | CLI | Notes |
|------|-----|-------|
| `list_targets` | `wrangler --version`, `wrangler whoami --json`, `wrangler.toml` / `wrangler.json(c)` | Only `signedIn` boolean — never returns email/account ids |
| `list_deployments` | `wrangler deployments list --json [--name]` | `id` = primary `version_id` (highest traffic %) so agents can pass it to rollback |
| `get_deployment` | `wrangler versions view <version-id> --json [--name]` | Plain-language summary of the Worker version |
| `get_logs` | `wrangler tail [--name] --format json [--version-id]` | **Bounded window**: process is killed after ~5s; partial stdout is parsed |
| `redeploy` | `wrangler deploy [--name]` | **Uploads a new version from local source** (not a republish of an old id). Deploy has no `--json` in 4.164.0 — parse text for `Current Version ID` |
| `rollback` | `wrangler rollback <version-id> --yes [--name]` | **Publishes** that version as current traffic (does not rebuild) |

## Write semantics

- **redeploy**: runs `wrangler deploy` in the project cwd — builds/uploads a **new** Worker version from local files.
- **rollback**: points production traffic at an existing Worker **version** (`wrangler rollback`). Same family as `wrangler versions deploy <id>@100`.

## Fixtures

`test/fixtures/cloudflare/` were captured from throwaway Worker `mdb-throwaway-bridge` (deployed twice, rolled back, then deleted) on Wrangler 4.164.0, then scrubbed (emails, account ids, real version/deployment UUIDs → examples). `tail.jsonl` stays synthetic with a fake token for redaction tests (live `wrangler tail` produced no lines in the short window). `deploy.txt` is scrubbed deploy stdout.

## Detection

Reads `name` from `wrangler.toml`, `wrangler.json`, or `wrangler.jsonc` in the cwd.
