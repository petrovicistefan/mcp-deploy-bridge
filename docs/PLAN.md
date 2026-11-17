# Implementation plan (v0.1)

Scope: Vercel + Cloudflare Workers. See PRODUCT.md for what this is not.

## Milestones

1. **Scaffold** — package.json, tsconfig strict, stdio server, `serverInfo.version` from package.json, `npm run typecheck | test | check:rules | build`, AGENTS.md copied from suite conventions.
2. **Core** — normalized types (`Deployment`, `LogLine`, `Capability`), adapter interface, CLI runner with timeout and JSON parsing (pure logic + tests with recorded CLI fixtures, no network in tests).
3. **Vercel adapter** — list/get deployments, logs, redeploy, rollback (`vercel rollback`, `vercel promote`).
4. **Cloudflare adapter** — `wrangler deployments list`, `wrangler tail` (bounded window), `wrangler rollback`.
5. **Safety** — confirm gate + dry-run output, `destructiveHint`, redaction of env values and tokens in any CLI output (tests).
6. **Release prep** — README, server.json, glama.json, demo, add to `mcp-marketplace` pin check. Publishing stays with Stefan.

## Rules to enforce in `check:rules`

- No tool accepts a token or secret argument.
- Every write tool has a confirm gate test.
- Version strings match across package.json, server.json, serverInfo.

## Manual verification

Drive it from Claude Code against a throwaway Vercel project and a throwaway Worker: deploy twice, roll back, read logs.

## Open (Stefan)

- Pricing for the hosted log-retention tier.
- Final name.
