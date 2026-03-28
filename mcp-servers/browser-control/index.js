#!/usr/bin/env node
/**
 * Browser Control MCP Server
 *
 * Gives Claude (and any MCP-compatible AI tool) full browser automation
 * capabilities via Playwright: navigate, click, fill forms, screenshot, and more.
 *
 * Transport: stdio (standard for Claude Code MCP integration)
 *
 * Usage:
 *   node index.js
 *
 * Configuration (environment variables):
 *   BROWSER_TYPE         chromium | firefox | webkit   (default: chromium)
 *   BROWSER_HEADLESS     true | false                  (default: true)
 *   BROWSER_PROFILE_DIR  /path/to/profile              (persist cookies/session)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { navigationTools } from './tools/navigation.js';
import { interactionTools } from './tools/interaction.js';
import { contentTools } from './tools/content.js';
import { tabTools } from './tools/tabs.js';
import browser from './browser.js';

// ── Build tool registry ────────────────────────────────────────────────────────

const allTools = [
  ...navigationTools,
  ...interactionTools,
  ...contentTools,
  ...tabTools,
];

// ── Create server ──────────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'browser-control',
  version: '1.0.0',
});

// Register every tool
for (const tool of allTools) {
  server.tool(
    tool.name,
    tool.description,
    tool.inputSchema,
    async (args) => {
      try {
        const result = await tool.handler(args);

        // If the result contains a base64 image, return it as image content
        if (result && result.type === 'image') {
          return {
            content: [
              {
                type: 'image',
                data: result.data,
                mimeType: result.mimeType,
              },
              {
                type: 'text',
                text: JSON.stringify({ url: result.url, title: result.title }),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (err) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: err.message, tool: tool.name }),
            },
          ],
          isError: true,
        };
      }
    }
  );
}

// ── Graceful shutdown ──────────────────────────────────────────────────────────

async function shutdown() {
  await browser.close();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('beforeExit', shutdown);

// ── Start ──────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so it doesn't interfere with stdio MCP protocol
  process.stderr.write(
    `Browser Control MCP Server started (${allTools.length} tools)\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err.message}\n`);
  process.exit(1);
});
