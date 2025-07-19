import { Result, ok, err, isOk } from "../types";
import { ClaudeFlowIntegration } from "./claude-flow";

export interface MemoryEntry {
  key: string;
  value: any;
  namespace?: string;
  ttl?: number;
}

export interface MemorySearchResult {
  key: string;
  value: any;
  score: number;
}

export class MemoryIntegration {
  constructor(private claudeFlow: ClaudeFlowIntegration) {}

  async store(entry: MemoryEntry): Promise<Result<void, Error>> {
    const args: Record<string, string> = {
      action: "store",
      key: entry.key,
      value: JSON.stringify(entry.value)
    };

    if (entry.namespace) args['namespace'] = entry.namespace;
    if (entry.ttl) args['ttl'] = entry.ttl.toString();

    const result = await this.claudeFlow.runHook("memory-usage", args);
    
    if (!isOk(result)) return result;
    
    try {
      const response = JSON.parse(result.value);
      return response.success ? ok(undefined) : err(new Error(response.error || "Memory store failed"));
    } catch (error) {
      return err(new Error(`Failed to parse memory response: ${error}`));
    }
  }

  async retrieve(key: string, namespace?: string): Promise<Result<any, Error>> {
    const args: Record<string, string> = {
      action: "retrieve",
      key
    };

    if (namespace) args['namespace'] = namespace;

    const result = await this.claudeFlow.runHook("memory-usage", args);
    
    if (!isOk(result)) return result;
    
    try {
      const response = JSON.parse(result.value);
      if (!response.success) {
        return err(new Error(response.error || "Memory retrieve failed"));
      }
      return ok(response.value);
    } catch (error) {
      return err(new Error(`Failed to parse memory response: ${error}`));
    }
  }

  async search(pattern: string, limit: number = 10): Promise<Result<MemorySearchResult[], Error>> {
    const args: Record<string, string> = {
      pattern,
      limit: limit.toString()
    };

    const result = await this.claudeFlow.runHook("memory-search", args);
    
    if (!isOk(result)) return result;
    
    try {
      const response = JSON.parse(result.value);
      if (!response.success) {
        return err(new Error(response.error || "Memory search failed"));
      }
      return ok(response.results || []);
    } catch (error) {
      return err(new Error(`Failed to parse memory response: ${error}`));
    }
  }

  async delete(key: string, namespace?: string): Promise<Result<void, Error>> {
    const args: Record<string, string> = {
      action: "delete",
      key
    };

    if (namespace) args['namespace'] = namespace;

    const result = await this.claudeFlow.runHook("memory-usage", args);
    
    if (!isOk(result)) return result;
    
    try {
      const response = JSON.parse(result.value);
      return response.success ? ok(undefined) : err(new Error(response.error || "Memory delete failed"));
    } catch (error) {
      return err(new Error(`Failed to parse memory response: ${error}`));
    }
  }

  async list(namespace?: string): Promise<Result<MemoryEntry[], Error>> {
    const args: Record<string, string> = {
      action: "list"
    };

    if (namespace) args['namespace'] = namespace;

    const result = await this.claudeFlow.runHook("memory-usage", args);
    
    if (!isOk(result)) return result;
    
    try {
      const response = JSON.parse(result.value);
      if (!response.success) {
        return err(new Error(response.error || "Memory list failed"));
      }
      return ok(response.entries || []);
    } catch (error) {
      return err(new Error(`Failed to parse memory response: ${error}`));
    }
  }

  // Helper to store swarm conductor state
  async storeSwarmState(sessionId: string, state: any): Promise<Result<void, Error>> {
    return this.store({
      key: `swarm-conductor/sessions/${sessionId}`,
      value: state,
      namespace: "swarm-conductor"
    });
  }

  // Helper to retrieve swarm conductor state
  async getSwarmState(sessionId: string): Promise<Result<any, Error>> {
    return this.retrieve(`swarm-conductor/sessions/${sessionId}`, "swarm-conductor");
  }
}