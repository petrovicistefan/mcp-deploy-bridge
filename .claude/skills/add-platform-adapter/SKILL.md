---
name: add-platform-adapter
description: Add or extend a hosting platform adapter (Vercel, Cloudflare Workers, Fly.io, Railway) behind the normalized deploy tools. Use when adding a platform or a tool to a platform.
---

# Add a platform adapter

1. **Research the real CLI, do not trust memory.** Run `<cli> --version` and `<cli> <cmd> --help` for every command you need. Note which commands emit JSON (`--json`, `--format json`). Record the tested CLI version in `src/adapters/<platform>/README.md`.
2. **Record fixtures.** Capture real JSON output from a throwaway project into `test/fixtures/<platform>/<command>.json`. Scrub account ids, emails, team names, URLs and tokens before saving (replace with `example`). Never save env values.
3. **Implement `src/adapters/<platform>/index.ts`** against the `Adapter` interface in `src/adapters/types.ts`:
   - `capabilities`: exactly the tools this platform supports.
   - Unsupported tools throw `UnsupportedError(platform, tool)`.
   - Spawn through `src/cli-runner.ts` only (argument array, timeout, no shell).
   - Map raw output to the normalized `Deployment` / `LogLine` types. Unknown statuses map to `unknown`, never to `ready`.
   - All output goes through `src/redact.ts`.
4. **Write operations** (`redeploy`, `rollback`): document in the adapter README what the platform actually does (promote, republish, new deploy). The tool result must state that action in plain words.
5. **Tests**: parser tests from fixtures, capability table test, unsupported-tool test, redaction test with a fake token in fixture output.
6. **Detection**: `list_targets` finds the project from local config (`.vercel/project.json`, `wrangler.toml`/`wrangler.jsonc`, `fly.toml`, `railway.json`) and reports whether the CLI is installed and signed in, without printing account details.
7. Run the gates from `AGENTS.md` and update `docs/PRODUCT.md` "Platforms".
