# MCP Deploy Bridge

**One MCP server for Vercel and Cloudflare Workers: list deployments, read status and logs, redeploy, and roll back — same tools for every platform your AI agent touches.**

Give Claude Code, Cursor, or any MCP client a single deploy control plane. Deploy Bridge wraps each platform CLI (`vercel`, `wrangler`) behind one normalized schema, so the agent does not need a different MCP server per host. Write operations require explicit `confirm: true`. Platform tokens stay in your already-signed-in CLIs — this server never asks for API keys and never returns environment variable values.

[![npm version](https://img.shields.io/npm/v/mcp-deploy-bridge?color=blue)](https://www.npmjs.com/package/mcp-deploy-bridge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/node-%3E%3D22.18-brightgreen)](https://nodejs.org)
[![MCP](https://img.shields.io/badge/MCP-stdio-purple)](https://modelcontextprotocol.io)

> **Part of the [petrovicistefan MCP suite](https://github.com/petrovicistefan/mcp-marketplace)** — local-first guardrails for AI coding agents.

**Keywords:** MCP deploy server, Vercel rollback MCP, Cloudflare Workers MCP, AI agent redeploy, Claude Code deploy tools, Cursor MCP hosting, `vercel rollback`, `wrangler rollback`, multi-platform deployment bridge.

---

## Quick Install

**Requirements:** Node.js ≥ 22.18, plus the platform CLIs you use (`vercel` and/or `wrangler`) installed and signed in.

### Cursor

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=deploy-bridge&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1kZXBsb3ktYnJpZGdlIl19)

Deeplink:  
`cursor://anysphere.cursor-deeplink/mcp/install?name=deploy-bridge&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIm1jcC1kZXBsb3ktYnJpZGdlIl19`

Or add to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "deploy-bridge": {
      "command": "npx",
      "args": ["-y", "mcp-deploy-bridge"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add deploy-bridge -- npx -y mcp-deploy-bridge
```

Marketplace (after the plugin ships):

```bash
/plugin marketplace add petrovicistefan/mcp-marketplace
/plugin install mcp-deploy-bridge@petrovicistefan-mcp
```

### Claude Desktop

```json
{
  "mcpServers": {
    "deploy-bridge": {
      "command": "npx",
      "args": ["-y", "mcp-deploy-bridge"]
    }
  }
}
```

### VS Code

[![Install in VS Code](https://img.shields.io/badge/Install%20in-VS%20Code-007ACC?style=flat&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=deploy-bridge&config=%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22mcp-deploy-bridge%22%5D%7D)

### Any MCP client

```bash
npx -y mcp-deploy-bridge
```

**⭐ Star the repo** → [github.com/petrovicistefan/mcp-deploy-bridge](https://github.com/petrovicistefan/mcp-deploy-bridge)

---

## Why Deploy Bridge?

Official platform MCP servers are uneven: Vercel’s has no rollback tool even though `vercel rollback` exists; Cloudflare, Fly.io and Railway expose partial deploy/log paths. Agents that ship to more than one host end up juggling different schemas — or guessing CLI flags.

Deploy Bridge gives one answer:

| Need | What you get |
|------|----------------|
| Same tools everywhere | `list_targets`, `list_deployments`, `get_deployment`, `get_logs`, `redeploy`, `rollback` |
| Safe writes | `confirm: true` required; dry-run text otherwise; `destructiveHint` |
| No secret args | Auth = your local CLI session only |
| No env leaks | CLI output passes through redaction before tool results |
| Honest gaps | Unsupported tools throw a typed error naming the platform — never a silent no-op |

### When to use

- Your agent should **inspect production deploys** after a push without opening three dashboards  
- You need **rollback from chat** with an explicit confirm step  
- You run **Vercel and Cloudflare Workers** (Fly.io / Railway next) and want one MCP config  
- Platform log retention is short and you need a **bounded log pull** while the window still exists  

---

## Tools

| Tool | Kind | Description |
|------|------|-------------|
| `list_targets` | read | Detected projects from `.vercel/project.json` / `wrangler.toml` + CLI install/auth booleans |
| `list_deployments` | read | Normalized id, platform, status, commit, created, url |
| `get_deployment` | read | Status plus a short plain-language summary |
| `get_logs` | read | Normalized lines (time / level / message); Cloudflare `tail` is time-bounded |
| `redeploy` | write | Vercel: `vercel redeploy`. Cloudflare: `wrangler deploy` (new version from local source) |
| `rollback` | write | Vercel: promotes via `vercel rollback`. Cloudflare: publishes a Worker version via `wrangler rollback` |

Pass `platform: "vercel" | "cloudflare"` when more than one adapter is registered.

---

## Example prompts

```
List deploy targets in this repo and show the last 5 Vercel deployments.
```

```
Get logs for the latest Cloudflare Worker version, errors only, last hour.
```

```
Dry-run a rollback to deployment dpl_… on Vercel, then ask me before confirming.
```

```
Redeploy the previous Vercel deployment id … — wait for my confirm:true.
```

---

## Platforms (v0.1)

| Platform | CLI tested | Notes |
|----------|------------|--------|
| **Vercel** | 65.17.0 | list / inspect / logs / redeploy / rollback |
| **Cloudflare Workers** | Wrangler 4.164.0 | deployments list / versions view / bounded tail / deploy / rollback |

Next: Fly.io, Railway.

---

## Safety

- Write tools refuse to change production without `confirm: true`  
- Tokens and `DATABASE_URL`-style values in CLI text are redacted  
- Spawns use argument arrays only (`shell: false`)  
- No telemetry  

See `AGENTS.md` and `docs/DECISIONS.md` (ADR-001–005).

---

## Limitations

- Needs each platform CLI installed and signed in locally  
- Rollback semantics differ by platform (documented in the tool result)  
- Free local mode cannot keep logs longer than the platform retains them  
- Package must be published to npm for one-click `npx` install from a clean machine  

---

## Development

```bash
npm ci
npm run check && npm run check:rules && npm test && npm run build && npm run test:integration
```

Never run live `redeploy` / `rollback` against a real project except a throwaway named for manual verification.

Demo script (VHS): [`docs/demo.tape`](docs/demo.tape).

---

## More MCP Servers by the Author

**Part of the [petrovicistefan MCP suite](https://github.com/petrovicistefan/mcp-marketplace).**

| Server | Purpose |
|--------|---------|
| [mcp-security-guard](https://github.com/petrovicistefan/mcp-security-guard) | Audit MCP servers for tool poisoning and leaked secrets |
| [mcp-database-doctor](https://github.com/petrovicistefan/mcp-database-doctor) | Offline PostgreSQL migration and query diagnostics |
| [mcp-api-guardian](https://github.com/petrovicistefan/mcp-api-guardian) | OpenAPI contract and breaking-change checks |
| [mcp-dependency-doctor](https://github.com/petrovicistefan/mcp-dependency-doctor) | Read-only npm audit and dependency health |
| [mcp-cost-optimizer](https://github.com/petrovicistefan/mcp-cost-optimizer) | Local LLM cost and model-switch estimates |
| [mcp-seo-auditor](https://github.com/petrovicistefan/mcp-seo-auditor) | On-page SEO audits from the agent |
| **mcp-deploy-bridge** | **Multi-platform deploy / logs / rollback (you are here)** |

---

## License

MIT © Stefan Petrovici
