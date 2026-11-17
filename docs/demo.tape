# VHS demo for mcp-deploy-bridge
# Shows tool discovery and a safe dry-run rollback (no live write)

Output docs/demo.gif

Require echo

Set Shell "bash"
Set FontSize 14
Set Width 1200
Set Height 600
Set TypingSpeed 45ms
Set Theme "Catppuccin Mocha"

Type "# MCP Deploy Bridge — one schema for Vercel + Cloudflare deploys"
Sleep 400ms
Enter
Sleep 300ms

Type "# Build and start a one-shot tools/list + dry-run rollback"
Sleep 400ms
Enter
Sleep 300ms

Type "npm run build && node --input-type=module <<'EOF'"
Enter
Type "import { Client } from '@modelcontextprotocol/sdk/client/index.js';"
Enter
Type "import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';"
Enter
Type "const c = new Client({ name: 'demo', version: '1.0.0' });"
Enter
Type "await c.connect(new StdioClientTransport({ command: process.execPath, args: ['dist/server.js'] }));"
Enter
Type "console.log('version', c.getServerVersion());"
Enter
Type "console.log('tools', (await c.listTools()).tools.map(t => t.name));"
Enter
Type "const dry = await c.callTool({ name: 'rollback', arguments: { platform: 'vercel', to: 'dpl_example', confirm: false } });"
Enter
Type "console.log(dry.content[0].text);"
Enter
Type "await c.close();"
Enter
Type "EOF"
Enter
Sleep 8s

Type "# confirm:false → dry-run only. Production needs confirm:true."
Sleep 800ms
Enter
Sleep 1s
