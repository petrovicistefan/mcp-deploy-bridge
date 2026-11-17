## Unreleased

- Release prep: SEO README, `glama.json`, `docs/demo.tape`, marketplace plugin entry (pin `@0.1.0` after npm publish).
- Cloudflare `redeploy` via `wrangler deploy`; fixtures refreshed from a deleted throwaway Worker (scrubbed).
- Safety: stronger `redact` for env values/connection strings, confirm-gate regression tests for both adapters, `check:rules` requires adapter redact imports, ADR-005.
- Cloudflare Workers adapter (Wrangler 4.164.0): deployments list, versions view, bounded `tail`, rollback; `redeploy` returns typed unsupported; scrubbed fixtures.
- Vercel adapter (CLI 65.17.0): list/get deployments, logs, redeploy, rollback with confirm dry-run; scrubbed fixtures; `redact` on CLI-derived strings.
- Core: normalized `Deployment` / `LogLine` / `Target` types, adapter interface + registry, `UnsupportedError`, `normalizeStatus`, and `runCli` with timeout/JSON parsing (fixture-backed tests).
- Scaffold: TypeScript strict ESM package, stdio MCP server with version from `package.json`, `check:rules`, unit and integration tests.
