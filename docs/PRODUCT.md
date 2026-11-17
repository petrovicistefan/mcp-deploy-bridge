# Product: MCP Deploy Bridge

Status: idea, not built. Written 2026-11-18.

## What it is

One MCP server that gives an AI coding agent the same small set of deploy operations on every hosting platform: list deployments, read status, read logs, redeploy, roll back. It wraps each platform's own CLI or API behind one tool schema, so the agent does not need to know whether the app runs on Vercel, Cloudflare Workers, Fly.io or Railway.

## Why

- Official platform MCP servers are uneven. Vercel's has no rollback tool although the CLI has `vercel rollback`. Fly.io's is experimental and has no deploy or rollback. Railway and Cloudflare expose partial redeploy or rollback paths.
- Platform log retention is short (Vercel Hobby: one hour), so logs are often gone when the agent looks.
- The closest community project (agent-deploy-dashboard-mcp) lists Railway and Fly.io logs and redeploy as planned, not built.

## What it is NOT

- Not a CI/CD system and not a build tool. It triggers and inspects deploys; it does not build images.
- Not a replacement for the official platform servers' full API (domains, DNS, billing, team management are out of scope).
- Not a hosting provider and not a secrets manager. It never reads or returns environment variable values.
- Not autonomous: rollback and redeploy require explicit confirmation from the caller.

## Users

Developers and small teams running apps on more than one platform, who drive deploy work through Claude Code, Cursor or another MCP client.

## Tools (v0.1 plan)

| Tool | Kind | Notes |
|------|------|-------|
| `list_targets` | read | Detected projects per platform from local config and CLI auth |
| `list_deployments` | read | Normalized: id, platform, status, commit, created, url |
| `get_deployment` | read | Status plus build and runtime summary |
| `get_logs` | read | Normalized log lines, with time window and level filter |
| `redeploy` | write | Requires `confirm: true` |
| `rollback` | write | To a named previous deployment; requires `confirm: true` |

## Platforms

v0.1: Vercel and Cloudflare Workers (both implemented). Cloudflare does not support `redeploy` (typed `unsupported` error). Next: Fly.io, Railway. Each platform adapter states which tools it supports; unsupported tools return a clear error, never a silent no-op.

## Pricing

Undecided (Stefan's decision). Suite pattern: local stdio free; a hosted Pro tier with log capture beyond platform retention, through `mcp-control-plane` quotas.

## Known limitations (expected)

- Depends on each platform's CLI being installed and signed in locally.
- Rollback semantics differ per platform (Vercel promotes a previous deployment; Cloudflare publishes a previous Worker version). The tool documents what it actually did.
- Free local mode cannot keep logs longer than the platform does.
