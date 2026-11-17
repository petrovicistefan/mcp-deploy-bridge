## Unreleased

- Vercel adapter (CLI 65.17.0): list/get deployments, logs, redeploy, rollback with confirm dry-run; scrubbed fixtures; `redact` on CLI-derived strings.
- Core: normalized `Deployment` / `LogLine` / `Target` types, adapter interface + registry, `UnsupportedError`, `normalizeStatus`, and `runCli` with timeout/JSON parsing (fixture-backed tests).
- Scaffold: TypeScript strict ESM package, stdio MCP server with version from `package.json`, `check:rules`, unit and integration tests.
