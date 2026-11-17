# AGENTS.md

Hard rules for anyone (human or AI agent) changing this repo. Read `docs/PRODUCT.md`, `docs/DECISIONS.md` and `docs/PLAN.md` before writing code. Each rule below must be enforced by `npm run check:rules` (`scripts/check-rules.mjs`, built in milestone 1). Do not weaken a check to make a change pass.

## Rules

1. **Version sync.** `package.json` `version` equals `server.json` `version` and every `server.json` `packages[].version`.
2. **One version source.** `serverInfo.version` comes from `package.json` via `src/version.ts`. No version string literals in `src`.
3. **No secret arguments.** No tool input schema has a field whose name matches `/token|secret|password|api.?key|credential/i`. Platform auth comes only from the user's signed-in CLI.
4. **Never return env values.** No tool returns environment variable values. All CLI output passes through `src/redact.ts` before it reaches a tool result.
5. **Confirm gate.** Every write tool (`redeploy`, `rollback`, and any future write) requires `confirm: true`, returns a dry-run description without it, and sets `destructiveHint: true`. Each write tool has a test proving both paths.
6. **Adapters only spawn their CLI.** Only files in `src/adapters/` and `src/cli-runner.ts` may use `child_process`. Spawn with an argument array, never a shell string (`shell: true` is forbidden).
7. **No network outside adapters.** Only `src/adapters/` and the opt-in hosted path (`src/hosted.ts`, `src/control-plane-client.ts`) may use `fetch`, `http`/`https`, `net` or WebSocket.
8. **No telemetry.** No analytics, tracking or crash-reporting dependencies or endpoints.
9. **No logs on stdio.** `src/server.ts` must not use `console.*`. Elsewhere `console.*` may only print a constant string.
10. **No silent no-ops.** An adapter that does not support a tool throws the typed `UnsupportedError` naming the platform; it never returns an empty success.
11. **Docs in step.** `AGENTS.md`, `docs/PRODUCT.md`, `docs/DECISIONS.md`, `CHANGELOG.md` exist; CHANGELOG has an `Unreleased` or current-version heading.

## Engineering

- TypeScript strict, ESM, Node >= 22.18. Deps: `@modelcontextprotocol/sdk`, `zod`. Ask before adding any other runtime dependency.
- Pure logic in its own file with a `*.test.ts` next to it (node:test + assert/strict). Tests never hit the network or a real CLI: use recorded JSON fixtures in `test/fixtures/<platform>/`.
- Every bug fix adds a regression test first. Never edit or skip a test to make it pass.
- Code, comments, commits and docs in English.

## Commands

```bash
npm run check          # tsc --noEmit
npm run check:rules    # rules above
npm test
npm run build
npm run test:integration   # stdio initialize + tools/list + calls against dist/
```

All five must pass before every commit. Report the real output.

## Git

- One branch per milestone from `docs/PLAN.md`: `feat/m<N>-<slug>`. Small commits. Never commit on `main`.
- Author: `Stefan Petrovici <5754511+petrovicistefan@users.noreply.github.com>`.
- Never push, never force-push, never publish to npm or the MCP Registry. Those steps are Stefan's.
- Never commit `.env`, `.DS_Store`, `node_modules`, `dist`, tokens.

## Do not

- Add features not in `docs/PRODUCT.md`. A new idea goes to Stefan, not into code.
- Run `redeploy` or `rollback` against a real project during development except the throwaway projects named in `docs/PLAN.md` manual verification.
