#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { listAdapters } from './adapters/registry.js';
import { VERSION } from './version.js';

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

function toolResult(output: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    structuredContent: output as Record<string, unknown>,
  };
}

export function createServer() {
  const server = new McpServer({ name: 'mcp-deploy-bridge', version: VERSION });

  server.registerTool(
    'list_targets',
    {
      description:
        'List detected deploy targets per platform from local config and CLI auth. Capabilities come from each adapter.',
      inputSchema: {},
      annotations: readAnnotations,
    },
    async () => {
      const cwd = process.cwd();
      const targets = (
        await Promise.all(listAdapters().map((adapter) => adapter.listTargets(cwd)))
      ).flat();
      return toolResult({ targets });
    },
  );

  return server;
}

await createServer().connect(new StdioServerTransport());
