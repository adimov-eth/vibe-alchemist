import { Command } from 'commander';
import { Result, ok, err, isErr } from '../../types';
import { createMCPServer } from '../../mcp/server-stub';

interface MCPServerOptions {
  port?: number;
  host?: string;
}

// Pure function to create MCP server command
export function mcpServerCommand(): Command {
  const command = new Command('mcp-server');

  command
    .description('Start the MCP server for external tool integration')
    .option('-p, --port <number>', 'Port to listen on', '3000')
    .option('-h, --host <string>', 'Host to bind to', 'localhost')
    .action(async (options: MCPServerOptions) => {
      const result = await startMCPServer(options);
      if (isErr(result)) {
        console.error('Failed to start MCP server:', result.error.message);
        process.exit(1);
      }
    });

  return command;
}

// Start the MCP server
async function startMCPServer(options: MCPServerOptions): Promise<Result<void, Error>> {
  try {
    const port = parseInt(String(options.port), 10);
    const host = options.host || 'localhost';

    console.log(`Starting MCP server on ${host}:${port}...`);

    const server = await createMCPServer({
      host,
      port
    });

    console.log(`MCP server running on ${host}:${port}`);
    console.log('Press Ctrl+C to stop');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\nShutting down MCP server...');
      await server.close();
      process.exit(0);
    });

    // Keep the process running
    await new Promise(() => {});
    
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}