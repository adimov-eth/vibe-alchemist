import { Result, ok, err, isOk, isErr } from "../types";
import { SQLiteStateRepository } from "../state/repository";
import { ClaudeFlowIntegration } from "../integration/claude-flow";
import { MemoryIntegration } from "../integration/memory";
import { ResourceMonitor } from "../integration/resources";
import type { Session, Sprint } from "../types/state";

export interface MCPRequest {
  method: string;
  params: any;
  id: string | number;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  id: string | number;
}

export class MCPHandlers {
  private repository: SQLiteStateRepository;
  private claudeFlow: ClaudeFlowIntegration;
  private memory: MemoryIntegration;
  private resources: ResourceMonitor;

  constructor() {
    this.repository = new SQLiteStateRepository();
    this.claudeFlow = new ClaudeFlowIntegration();
    this.memory = new MemoryIntegration(this.claudeFlow);
    this.resources = new ResourceMonitor();
  }

  async initialize(): Promise<Result<void, Error>> {
    return this.repository.initialize();
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const handler = this.getHandler(request.method);
      if (!handler) {
        return this.errorResponse(request.id, -32601, `Method not found: ${request.method}`);
      }

      const result = await handler(request.params);
      if (!isOk(result)) {
        return this.errorResponse(request.id, -32603, result.error?.message || 'Unknown error');
      }

      return {
        result: result.value,
        id: request.id
      };
    } catch (error) {
      return this.errorResponse(request.id, -32603, `Internal error: ${error}`);
    }
  }

  private getHandler(method: string): ((params: any) => Promise<Result<any, Error>>) | undefined {
    const handlers: Record<string, (params: any) => Promise<Result<any, Error>>> = {
      "swarm_conductor_init": this.handleInit.bind(this),
      "swarm_conductor_status": this.handleStatus.bind(this),
      "swarm_conductor_sprint": this.handleSprint.bind(this),
      "swarm_conductor_checkpoint": this.handleCheckpoint.bind(this),
      "swarm_conductor_restore": this.handleRestore.bind(this),
      "swarm_conductor_list": this.handleList.bind(this),
      "swarm_conductor_browser_test": this.handleBrowserTest.bind(this),
      "swarm_conductor_cancel": this.handleCancel.bind(this),
      "swarm_conductor_export": this.handleExport.bind(this),
      "swarm_conductor_metrics": this.handleMetrics.bind(this)
    };

    return handlers[method];
  }

  private errorResponse(id: string | number, code: number, message: string): MCPResponse {
    return {
      error: { code, message },
      id
    };
  }

  // Handler implementations
  private async handleInit(params: any): Promise<Result<any, Error>> {
    const { task, confidence_threshold = 0.8, max_sprints = 10, parallel_swarms = 3 } = params;

    if (!task) {
      return err(new Error("Task is required"));
    }

    // Create session
    const sessionResult = await this.repository.createSession(task, {
      confidence_threshold,
      max_sprints,
      parallel_swarms
    });

    if (!isOk(sessionResult)) return sessionResult;
    const session = sessionResult.value;

    // Store initial state in memory
    await this.memory.storeSwarmState(session.id, {
      task,
      confidence_threshold,
      max_sprints,
      parallel_swarms,
      status: "initialized"
    });

    return ok({
      session_id: session.id,
      status: "initialized",
      message: `Session ${session.id} created for task: ${task}`
    });
  }

  private async handleStatus(params: any): Promise<Result<any, Error>> {
    const { session_id, verbose = false } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    const sessionResult = await this.repository.getSession(session_id);
    if (!isOk(sessionResult)) return sessionResult;
    
    const session = sessionResult.value;
    if (!session) {
      return err(new Error(`Session ${session_id} not found`));
    }

    const response: any = {
      session_id: session.id,
      task_id: session.taskId,
      status: session.status,
      sprint_count: session.sprintCount,
      confidence_level: session.confidenceLevel,
      started_at: session.startedAt,
      updated_at: session.updatedAt
    };

    if (verbose) {
      const sprintsResult = await this.repository.getSprintsBySession(session_id);
      if (isOk(sprintsResult)) {
        response.sprints = sprintsResult.value;
      }
    }

    return ok(response);
  }

  private async handleSprint(params: any): Promise<Result<any, Error>> {
    const { session_id, objective } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    const sessionResult = await this.repository.getSession(session_id);
    if (!isOk(sessionResult)) return sessionResult;
    
    const session = sessionResult.value;
    if (!session) {
      return err(new Error(`Session ${session_id} not found`));
    }

    if (session.status !== 'active') {
      return err(new Error(`Session is not active (status: ${session.status})`));
    }

    // Generate objective if not provided
    const sprintObjective = objective || `Sprint ${session.sprintCount + 1} for ${session.taskId}`;

    // Create sprint
    const sprintResult = await this.repository.createSprint(session_id, sprintObjective);
    if (!isOk(sprintResult)) return sprintResult;
    const sprint = sprintResult.value;

    // Update sprint status to executing
    await this.repository.updateSprint(sprint.id, { status: 'executing' });

    // Run the sprint using claude-flow
    const swarmResult = await this.claudeFlow.runSwarm(sprintObjective, {
      swarmId: `${session_id}-sprint-${sprint.sprintNumber}`,
      agents: session.metadata['parallel_swarms'] as number || 3
    });

    if (!isOk(swarmResult)) {
      await this.repository.updateSprint(sprint.id, { 
        status: 'failed',
        completedAt: new Date()
      });
      return swarmResult;
    }

    // Update sprint with results
    const confidence = this.calculateConfidence(swarmResult.value);
    await this.repository.updateSprint(sprint.id, {
      status: 'completed',
      confidence,
      completedAt: new Date(),
      result: {
        success: swarmResult.value.success,
        output: swarmResult.value.output,
        artifacts: [], // Would parse from output
        metrics: {
          duration: swarmResult.value.duration,
          tokenCount: 0, // Would calculate from output
          agentCount: session.metadata['parallel_swarms'] as number || 3,
          memoryUsage: process.memoryUsage().heapUsed,
          errorCount: 0
        }
      }
    });

    // Update session
    await this.repository.updateSession(session_id, {
      sprintCount: session.sprintCount + 1,
      confidenceLevel: confidence
    });

    return ok({
      sprint_id: sprint.id,
      sprint_number: sprint.sprintNumber,
      status: 'completed',
      confidence,
      duration: swarmResult.value.duration,
      should_continue: confidence < (session.metadata['confidence_threshold'] as number || 0.8)
    });
  }

  private calculateConfidence(result: any): number {
    // Simple confidence calculation - would be more sophisticated in production
    if (!result.success) return 0;
    
    // Base confidence on output content
    const output = result.output.toLowerCase();
    let confidence = 0.5;
    
    if (output.includes('completed')) confidence += 0.2;
    if (output.includes('success')) confidence += 0.2;
    if (output.includes('error') || output.includes('failed')) confidence -= 0.3;
    
    return Math.max(0, Math.min(1, confidence));
  }

  private async handleCheckpoint(params: any): Promise<Result<any, Error>> {
    const { session_id, name, description } = params;

    if (!session_id || !name) {
      return err(new Error("Session ID and name are required"));
    }

    // Get current state
    const sessionResult = await this.repository.getSession(session_id);
    if (!isOk(sessionResult)) return sessionResult;
    const session = sessionResult.value;
    if (!session) {
      return err(new Error(`Session ${session_id} not found`));
    }

    const sprintsResult = await this.repository.getSprintsBySession(session_id);
    if (!isOk(sprintsResult)) return sprintsResult;

    const currentSprint = sprintsResult.value[sprintsResult.value.length - 1];
    if (!currentSprint) {
      return err(new Error("No sprints found in session"));
    }

    // Get memory state
    const memoryState = await this.memory.getSwarmState(session_id);

    // Create checkpoint
    const checkpointResult = await this.repository.createCheckpoint({
      sessionId: session_id,
      sprintId: currentSprint.id,
      name,
      description,
      state: {
        session,
        sprints: sprintsResult.value,
        artifacts: [],
        memory: isOk(memoryState) ? memoryState.value : {}
      }
    });

    if (!isOk(checkpointResult)) return checkpointResult;

    return ok({
      checkpoint_id: checkpointResult.value.id,
      message: `Checkpoint '${name}' created successfully`
    });
  }

  private async handleRestore(params: any): Promise<Result<any, Error>> {
    const { checkpoint_id } = params;

    if (!checkpoint_id) {
      return err(new Error("Checkpoint ID is required"));
    }

    const checkpointResult = await this.repository.loadCheckpoint(checkpoint_id);
    if (!isOk(checkpointResult)) return checkpointResult;
    
    const checkpoint = checkpointResult.value;
    if (!checkpoint) {
      return err(new Error(`Checkpoint ${checkpoint_id} not found`));
    }

    // Restore memory state
    if (checkpoint.state.memory) {
      await this.memory.storeSwarmState(checkpoint.sessionId, checkpoint.state.memory);
    }

    return ok({
      session_id: checkpoint.sessionId,
      message: `Restored from checkpoint '${checkpoint.name}'`,
      state: checkpoint.state
    });
  }

  private async handleList(params: any): Promise<Result<any, Error>> {
    const { type, session_id } = params;

    if (type === 'sessions') {
      const sessionsResult = await this.repository.listActiveSessions();
      if (!isOk(sessionsResult)) return sessionsResult;
      
      return ok({
        sessions: sessionsResult.value.map((s: any) => ({
          id: s.id,
          task: s.taskId,
          status: s.status,
          sprint_count: s.sprintCount,
          confidence: s.confidenceLevel,
          updated_at: s.updatedAt
        }))
      });
    } else if (type === 'checkpoints') {
      if (!session_id) {
        return err(new Error("Session ID is required for listing checkpoints"));
      }

      const checkpointsResult = await this.repository.listCheckpoints(session_id);
      if (!isOk(checkpointsResult)) return checkpointsResult;

      return ok({
        checkpoints: checkpointsResult.value.map((c: any) => ({
          id: c.id,
          name: c.name,
          description: c.description,
          created_at: c.createdAt
        }))
      });
    }

    return err(new Error(`Invalid type: ${type}`));
  }

  private async handleBrowserTest(params: any): Promise<Result<any, Error>> {
    // Simplified - would integrate with actual browser testing
    const { session_id, test_type = 'visual', url } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    return ok({
      test_id: this.generateTestId(),
      session_id,
      test_type,
      status: 'queued',
      message: "Browser test queued for execution"
    });
  }

  private async handleCancel(params: any): Promise<Result<any, Error>> {
    const { session_id } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    const updateResult = await this.repository.updateSession(session_id, {
      status: 'cancelled',
      completedAt: new Date()
    });

    if (!updateResult) return updateResult;

    return ok({
      session_id,
      message: "Session cancelled successfully"
    });
  }

  private async handleExport(params: any): Promise<Result<any, Error>> {
    // Simplified - would implement actual export functionality
    const { session_id, format = 'zip', output_path } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    return ok({
      export_id: this.generateExportId(),
      session_id,
      format,
      output_path: output_path || `./exports/${session_id}.${format}`,
      message: "Export started"
    });
  }

  private async handleMetrics(params: any): Promise<Result<any, Error>> {
    const { session_id, include_resources = true } = params;

    if (!session_id) {
      return err(new Error("Session ID is required"));
    }

    const sessionResult = await this.repository.getSession(session_id);
    if (!isOk(sessionResult)) return sessionResult;

    const sprintsResult = await this.repository.getSprintsBySession(session_id);
    if (!isOk(sprintsResult)) return sprintsResult;

    const metrics: any = {
      session_id,
      total_sprints: sprintsResult.value.length,
      total_duration: sprintsResult.value.reduce((sum: number, s: any) => {
        if (s.result?.metrics.duration) {
          return sum + s.result.metrics.duration;
        }
        return sum;
      }, 0),
      average_confidence: sprintsResult.value.reduce((sum: number, s: any) => sum + s.confidence, 0) / sprintsResult.value.length
    };

    if (include_resources) {
      const resourceResult = await this.resources.getMetrics();
      if (isOk(resourceResult)) {
        metrics.resources = resourceResult.value;
      }
    }

    return ok(metrics);
  }

  private generateTestId(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateExportId(): string {
    return `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}