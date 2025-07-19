import { serve } from "bun";
import { MCPHandlers, type MCPRequest } from "./handlers";
import { tools } from "./tools";
import { isOk } from "../types";

export interface MCPServerOptions {
  port?: number;
  host?: string;
}

export class MCPServer {
  private handlers: MCPHandlers;
  private server?: any;

  constructor(private options: MCPServerOptions = {}) {
    this.handlers = new MCPHandlers();
  }

  async start(): Promise<void> {
    // Initialize handlers
    const initResult = await this.handlers.initialize();
    if (!isOk(initResult)) {
      throw new Error(`Failed to initialize handlers: ${initResult.error?.message || 'Unknown error'}`);
    }

    const port = this.options.port || 3000;
    const host = this.options.host || "0.0.0.0";

    this.server = serve({
      port,
      hostname: host,
      fetch: this.handleRequest.bind(this),
    });

    console.log(`MCP Server listening on ${host}:${port}`);
  }

  async stop(): Promise<void> {
    if (this.server) {
      this.server.stop();
      console.log("MCP Server stopped");
    }
  }

  private async handleRequest(request: Request): Promise<Response> {
    // Handle CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: this.getCorsHeaders()
      });
    }

    // Handle different endpoints
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case "/":
        return this.handleInfo();
      case "/tools":
        return this.handleTools();
      case "/rpc":
        return this.handleRPC(request);
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  private handleInfo(): Response {
    return new Response(JSON.stringify({
      name: "swarm-conductor",
      version: "1.0.0-alpha",
      description: "Meta-orchestrator for claude-flow swarms",
      endpoints: {
        "/": "Server information",
        "/tools": "List available tools",
        "/rpc": "JSON-RPC endpoint"
      }
    }), {
      headers: {
        "Content-Type": "application/json",
        ...this.getCorsHeaders()
      }
    });
  }

  private handleTools(): Response {
    return new Response(JSON.stringify({
      tools: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }))
    }), {
      headers: {
        "Content-Type": "application/json",
        ...this.getCorsHeaders()
      }
    });
  }

  private async handleRPC(request: Request): Promise<Response> {
    try {
      // Parse JSON-RPC request
      const body = await request.json();
      
      // Handle batch requests
      if (Array.isArray(body)) {
        const responses = await Promise.all(
          body.map(req => this.handlers.handleRequest(req))
        );
        return new Response(JSON.stringify(responses), {
          headers: {
            "Content-Type": "application/json",
            ...this.getCorsHeaders()
          }
        });
      }

      // Handle single request
      const response = await this.handlers.handleRequest(body as MCPRequest);
      return new Response(JSON.stringify(response), {
        headers: {
          "Content-Type": "application/json",
          ...this.getCorsHeaders()
        }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32700,
          message: "Parse error",
          data: (error as Error)?.message || 'Unknown error'
        },
        id: null
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...this.getCorsHeaders()
        }
      });
    }
  }

  private getCorsHeaders(): Record<string, string> {
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
  }
}

// CLI entry point
if (import.meta.main) {
  const server = new MCPServer({
    port: parseInt(process.env['PORT'] || "3000"),
    host: process.env['HOST'] || "0.0.0.0"
  });

  server.start().catch(error => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await server.stop();
    process.exit(0);
  });
}