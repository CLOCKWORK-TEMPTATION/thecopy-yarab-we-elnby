import './bootstrap/runtime-alias';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';
import helmet from 'helmet';
import { logger } from '@/utils/logger';

// Create an MCP server
const server = new McpServer({
  name: 'demo-server',
  version: '1.0.0'
});

// Add an addition tool
server.registerTool(
  'add',
  {
    title: 'Addition Tool',
    description: 'Add two numbers',
    inputSchema: {
      type: 'object',
      properties: {
        a: { type: 'number' },
        b: { type: 'number' }
      },
      required: ['a', 'b']
    }
  },
  async ({ a, b }: { a: number; b: number }) => {
    const output = { result: a + b };
    logger.info('Addition tool called', { a, b, result: output.result });
    return {
      content: [{ type: 'text', text: JSON.stringify(output) }],
      structuredContent: output
    };
  }
);

// Add a dynamic greeting resource
server.registerResource(
  'greeting',
  new ResourceTemplate('greeting://{name}', { list: undefined }),
  {
    title: 'Greeting Resource',
    description: 'Dynamic greeting generator'
  },
  async (uri: URL, { name }: { name: string }) => {
    logger.info('Greeting resource accessed', { name });
    return {
      contents: [
        {
          uri: uri.href,
          text: `Hello, ${name}!`
        }
      ]
    };
  }
);

// Set up Express and HTTP transport
const app = express();
app.use(helmet());
app.use(express.json());

app.post('/mcp', async (req, res) => {
  // Create a new transport for each request to prevent request ID collisions
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true
  });

  res.on('close', () => {
    transport.close();
  });

  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const port = parseInt(process.env['MCP_PORT'] || '3000');

app.listen(port, () => {
  logger.info(`Demo MCP Server running on http://localhost:${port}/mcp`);
}).on('error', (error) => {
  logger.error('Server error:', error);
  process.exit(1);
});
