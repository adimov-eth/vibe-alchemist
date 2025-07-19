import { MCPServerConfig } from '../types/cli';
import { MCPServer as ActualMCPServer } from './server';

export interface MCPServer {
  close: () => Promise<void>;
}

// Create MCP server with actual implementation
export async function createMCPServer(config: MCPServerConfig): Promise<MCPServer> {
  const server = new ActualMCPServer({
    port: config.port,
    host: config.host
  });
  
  // Start the server
  await server.start();
  
  // Return wrapper that matches expected interface
  return {
    close: async () => {
      await server.stop();
    }
  };
}