#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { cloudflareAdapter } from './adapters/cloudflare/index.js';
import { registerAdapter, listAdapters } from './adapters/registry.js';
import { vercelAdapter } from './adapters/vercel/index.js';
import { UnsupportedError } from './errors.js';
import { resolveAdapter } from './resolve.js';
import type { Platform } from './types.js';
import { VERSION } from './version.js';

registerAdapter(vercelAdapter);
registerAdapter(cloudflareAdapter);

const readAnnotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const writeAnnotations = {
  readOnlyHint: false,
  destructiveHint: true,
  idempotentHint: false,
  openWorldHint: true,
} as const;

const platformSchema = z.enum(['vercel', 'cloudflare']).optional();

function toolResult(output: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(output) }],
    structuredContent: output as Record<string, unknown>,
  };
}

function toolError(error: unknown) {
  const message =
    error instanceof UnsupportedError
      ? error.message
      : error instanceof Error
        ? error.message
        : 'Tool failed.';
  return { isError: true as const, content: [{ type: 'text' as const, text: message }] };
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
      try {
        const cwd = process.cwd();
        const targets = (
          await Promise.all(listAdapters().map((adapter) => adapter.listTargets(cwd)))
        ).flat();
        return toolResult({ targets });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'list_deployments',
    {
      description: 'List normalized deployments for a platform/project.',
      inputSchema: {
        platform: platformSchema,
        project: z.string().min(1).max(256).optional(),
        cwd: z.string().min(1).max(4096).optional(),
        limit: z.number().int().min(1).max(100).optional(),
      },
      annotations: readAnnotations,
    },
    async (args) => {
      try {
        const adapter = resolveAdapter(args.platform as Platform | undefined);
        const deployments = await adapter.listDeployments({
          project: args.project,
          cwd: args.cwd,
          limit: args.limit,
        });
        return toolResult({ deployments });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'get_deployment',
    {
      description: 'Get one deployment with a short build/runtime summary.',
      inputSchema: {
        id: z.string().min(1).max(512),
        platform: platformSchema,
        project: z.string().min(1).max(256).optional(),
        cwd: z.string().min(1).max(4096).optional(),
      },
      annotations: readAnnotations,
    },
    async (args) => {
      try {
        const adapter = resolveAdapter(args.platform as Platform | undefined);
        const deployment = await adapter.getDeployment({
          id: args.id,
          project: args.project,
          cwd: args.cwd,
        });
        return toolResult({ deployment });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'get_logs',
    {
      description: 'Get normalized log lines for a deployment or project (bounded window).',
      inputSchema: {
        id: z.string().min(1).max(512).optional(),
        platform: platformSchema,
        project: z.string().min(1).max(256).optional(),
        cwd: z.string().min(1).max(4096).optional(),
        since: z.string().min(1).max(64).optional(),
        until: z.string().min(1).max(64).optional(),
        level: z.enum(['info', 'warn', 'error', 'debug', 'unknown']).optional(),
        limit: z.number().int().min(1).max(10000).optional(),
      },
      annotations: readAnnotations,
    },
    async (args) => {
      try {
        const adapter = resolveAdapter(args.platform as Platform | undefined);
        const lines = await adapter.getLogs({
          id: args.id,
          project: args.project,
          cwd: args.cwd,
          since: args.since,
          until: args.until,
          level: args.level,
          limit: args.limit,
        });
        return toolResult({ lines });
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'redeploy',
    {
      description:
        'Redeploy. Requires confirm:true; otherwise returns a dry-run description. Vercel: `vercel redeploy` (rebuild prior deployment). Cloudflare: `wrangler deploy` (new version from local source).',
      inputSchema: {
        platform: platformSchema,
        project: z.string().min(1).max(256).optional(),
        cwd: z.string().min(1).max(4096).optional(),
        deploymentId: z.string().min(1).max(512).optional(),
        confirm: z.boolean().optional(),
      },
      annotations: writeAnnotations,
    },
    async (args) => {
      try {
        const adapter = resolveAdapter(args.platform as Platform | undefined);
        const result = await adapter.redeploy({
          project: args.project,
          cwd: args.cwd,
          deploymentId: args.deploymentId,
          confirm: args.confirm === true,
        });
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  server.registerTool(
    'rollback',
    {
      description:
        'Roll back to a named previous deployment/version. Requires confirm:true; otherwise returns a dry-run description. Vercel: promotes via `vercel rollback`. Cloudflare: publishes a Worker version via `wrangler rollback`.',
      inputSchema: {
        platform: platformSchema,
        project: z.string().min(1).max(256).optional(),
        cwd: z.string().min(1).max(4096).optional(),
        to: z.string().min(1).max(512),
        confirm: z.boolean().optional(),
      },
      annotations: writeAnnotations,
    },
    async (args) => {
      try {
        const adapter = resolveAdapter(args.platform as Platform | undefined);
        const result = await adapter.rollback({
          project: args.project,
          cwd: args.cwd,
          to: args.to,
          confirm: args.confirm === true,
        });
        return toolResult(result);
      } catch (error) {
        return toolError(error);
      }
    },
  );

  return server;
}

await createServer().connect(new StdioServerTransport());
