---
name: milestone
description: Implement one milestone from docs/PLAN.md end to end (branch, tests first, code, all gates, commit, report). Use when asked to build, continue or finish a milestone, or "the next step" of the plan.
---

# Implement a milestone

1. Read `AGENTS.md`, `docs/PRODUCT.md`, `docs/DECISIONS.md`, `docs/PLAN.md`. Pick the milestone named by the user, or the first one not marked done in `docs/PLAN.md`.
2. Branch from the latest milestone branch (or `docs/initial-plan` for M1): `git checkout -b feat/m<N>-<slug>`.
3. Write the tests first for every behaviour the milestone adds. Pure logic gets a `*.test.ts` next to it. CLI behaviour uses recorded fixtures in `test/fixtures/<platform>/`, never a live CLI.
4. Implement the smallest code that passes. Stay inside the milestone's scope; anything outside it goes to the report as a question, not into code.
5. If the milestone adds a rule or a safety behaviour, add its check to `scripts/check-rules.mjs` and prove the check fails on a deliberate violation (then revert the violation).
6. Run all gates and keep the real output:
   `npm run check && npm run check:rules && npm test && npm run build && npm run test:integration`
7. Update `CHANGELOG.md` under `Unreleased`, and mark the milestone done in `docs/PLAN.md` (`- [x]`). If a decision was made, add an ADR to `docs/DECISIONS.md`.
8. Commit in small commits with the author from `AGENTS.md`. Do not push.
9. Report: what was built, the gate output (pass/fail per command), what was NOT verified, open questions for Stefan.

Stop and ask instead of guessing when: a new runtime dependency is needed, a rule in `AGENTS.md` blocks the plan, or the plan conflicts with `docs/PRODUCT.md`.
