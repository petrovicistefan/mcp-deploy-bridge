# Decisions

## ADR-001: Wrap platform CLIs, not their MCP servers

Context: official platform MCP servers are uneven (Vercel MCP has no rollback; Fly.io MCP is experimental). Their CLIs and REST APIs are complete and stable.
Decision: each platform adapter calls the platform CLI (or REST API where the CLI lacks JSON output). We do not proxy other MCP servers.
Consequences: users need the CLI installed and signed in; we inherit the user's existing auth and never store platform tokens. Adapters must parse JSON output and pin tested CLI versions.

## ADR-002: Write operations need explicit confirmation

Context: redeploy and rollback change production.
Decision: `redeploy` and `rollback` require `confirm: true` and return a dry-run description when it is missing. Tools carry MCP `destructiveHint`.
Consequences: one extra round trip per write; no silent production changes.

## ADR-003: One normalized schema, per-adapter capability table

Context: platforms differ (Vercel promotes a deployment, Cloudflare publishes a Worker version).
Decision: tools return one normalized shape; each adapter declares supported tools; unsupported calls return a typed `unsupported` error naming the platform.
Consequences: no silent no-ops; agents can check `list_targets` capabilities first.

## ADR-004: Same suite conventions

Decision: TypeScript strict, stdio transport, `@modelcontextprotocol/sdk` + `zod`, node:test via tsx, version read from `package.json`, MIT, optional hosted path through `mcp-control-plane` (as in `mcp-database-doctor`).

## ADR-005: Redact CLI output before tool results

Context: platform CLIs may echo tokens, `DATABASE_URL`, or Bearer headers in logs and error text. Returning those to an MCP client would leak secrets into agent context.
Decision: every adapter runs CLI-derived strings through `src/redact.ts` before building tool results. Write tools still require `confirm: true` and advertise `destructiveHint`.
Consequences: some benign URLs may be over-redacted; that is preferred to leaking credentials. Patterns are expanded as new leak shapes appear, with regression tests.
