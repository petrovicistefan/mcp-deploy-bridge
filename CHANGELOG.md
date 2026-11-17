## Unreleased

## 0.1.0

- First release: stdio MCP server for Vercel and Cloudflare Workers.
- Tools: `list_targets`, `list_deployments`, `get_deployment`, `get_logs`, `redeploy`, `rollback` (writes need `confirm: true`).
- Vercel adapter (CLI 65.17.0) and Cloudflare adapter (Wrangler 4.164.0), including Cloudflare `redeploy` via `wrangler deploy`.
- Safety: redaction of tokens/env-like values, `check:rules`, fixture-backed tests.
- Docs: SEO README, `server.json`, `glama.json`, `docs/demo.tape`; marketplace plugin pin `@0.1.0`.
