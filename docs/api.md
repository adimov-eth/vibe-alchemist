# Swarm Conductor API Reference

## Table of Contents

1. [Core Types](#core-types)
2. [Main Functions](#main-functions)
3. [CLI Commands](#cli-commands)
4. [MCP Server API](#mcp-server-api)
5. [Configuration](#configuration)
6. [Error Handling](#error-handling)

## Core Types

### Result<T, E>

The fundamental type for error handling throughout the system.

```typescript
type Result<T, E = Error> = 
  | { ok: true; value: T }
  | { ok: false; error: E };
```

### SwarmState

Immutable representation of the current swarm state.

```typescript
interface SwarmState {
  readonly id: string;
  readonly phase: SPARCPhase;
  readonly confidence: number;
  readonly context: string;
  readonly previousStates: readonly SwarmState[];
  readonly tasks: readonly Task[];
  readonly agents: readonly Agent[];
  readonly checkpoint?: CheckpointInfo;
  readonly startedAt: number;
  readonly updatedAt: number;
}
```

### SPARCPhase

The current phase in the SPARC methodology.

```typescript
type SPARCPhase = 
  | 'planning' 
  | 'executing' 
  | 'testing' 
  | 'refactoring' 
  | 'completing';
```

### Task

Represents a unit of work within a sprint.

```typescript
interface Task {
  readonly id: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly assignedTo?: string;
  readonly dependencies: readonly string[];
  readonly confidence?: number;
  readonly subtasks?: readonly Task[];
  readonly metadata?: Record<string, unknown>;
}

type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'blocked';
```

### Agent

Represents an AI agent in the swarm.

```typescript
interface Agent {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly currentTask?: string;
  readonly capabilities: readonly string[];
  readonly performance: AgentPerformance;
}

type AgentType = 
  | 'architect' 
  | 'developer' 
  | 'tester' 
  | 'reviewer' 
  | 'coordinator'
  | 'specialist';

type AgentStatus = 'idle' | 'busy' | 'error' | 'offline';

interface AgentPerformance {
  readonly tasksCompleted: number;
  readonly averageConfidence: number;
  readonly errorRate: number;
}
```

### SprintConfig

Configuration for starting a new sprint.

```typescript
interface SprintConfig {
  readonly task: string;
  readonly agents?: readonly AgentType[];
  readonly confidenceThreshold?: number;
  readonly maxDepth?: number;
  readonly checkpointInterval?: number;
  readonly parallelSwarms?: number;
  readonly timeout?: number;
  readonly metadata?: Record<string, unknown>;
}
```

### CheckpointInfo

Information about a saved checkpoint.

```typescript
interface CheckpointInfo {
  readonly id: string;
  readonly stateId: string;
  readonly createdAt: number;
  readonly path: string;
  readonly size: number;
  readonly metadata?: Record<string, unknown>;
}
```

## Main Functions

### startSprint

Starts a new sprint with the given configuration.

```typescript
function startSprint(config: SprintConfig): Promise<Result<SwarmState>>
```

**Parameters:**
- `config`: Sprint configuration object

**Returns:**
- `Result<SwarmState>`: Success with final state or error

**Example:**
```typescript
const result = await startSprint({
  task: "Implement user authentication",
  agents: ['architect', 'developer', 'tester'],
  confidenceThreshold: 0.85
});
```

### resumeSprint

Resumes a sprint from a checkpoint.

```typescript
function resumeSprint(checkpointId: string): Promise<Result<SwarmState>>
```

**Parameters:**
- `checkpointId`: ID of the checkpoint to resume from

**Returns:**
- `Result<SwarmState>`: Success with resumed state or error

### analyzeDependencies

Analyzes task dependencies and creates an execution plan.

```typescript
function analyzeDependencies(
  tasks: readonly Task[]
): Result<DependencyGraph>
```

**Parameters:**
- `tasks`: Array of tasks to analyze

**Returns:**
- `Result<DependencyGraph>`: Dependency graph or error

### orchestrateSwarms

Manages multiple swarms running in parallel.

```typescript
function orchestrateSwarms(
  configs: readonly SprintConfig[]
): Promise<Result<readonly SwarmState[]>>
```

**Parameters:**
- `configs`: Array of sprint configurations

**Returns:**
- `Result<readonly SwarmState[]>`: Array of final states or error

### saveCheckpoint

Manually saves a checkpoint of the current state.

```typescript
function saveCheckpoint(
  state: SwarmState,
  metadata?: Record<string, unknown>
): Promise<Result<CheckpointInfo>>
```

**Parameters:**
- `state`: Current swarm state
- `metadata`: Optional metadata to include

**Returns:**
- `Result<CheckpointInfo>`: Checkpoint information or error

### loadCheckpoint

Loads a checkpoint from disk.

```typescript
function loadCheckpoint(
  checkpointId: string
): Promise<Result<SwarmState>>
```

**Parameters:**
- `checkpointId`: ID of the checkpoint to load

**Returns:**
- `Result<SwarmState>`: Loaded state or error

## CLI Commands

### init

Initialize a new swarm project.

```bash
swarm-conductor init [project-name] [options]
```

**Options:**
- `--template <type>`: Use a project template (default, web, api, ml)
- `--no-git`: Skip git initialization
- `--config <path>`: Use custom configuration file

### start

Start a new sprint.

```bash
swarm-conductor start <task> [options]
```

**Options:**
- `--agents <types>`: Comma-separated agent types
- `--confidence <threshold>`: Minimum confidence threshold (0-1)
- `--parallel <count>`: Number of parallel swarms
- `--checkpoint-interval <seconds>`: Checkpoint save interval
- `--timeout <minutes>`: Maximum execution time
- `--config <path>`: Use custom configuration file

**Example:**
```bash
swarm-conductor start "Build REST API" \
  --agents architect,developer,tester \
  --confidence 0.8 \
  --parallel 3
```

### resume

Resume from a checkpoint.

```bash
swarm-conductor resume <checkpoint-id> [options]
```

**Options:**
- `--force`: Force resume even if state is corrupted
- `--reset-agents`: Reset all agents to idle state
- `--config <path>`: Use custom configuration file

### mcp-server

Start the MCP server.

```bash
swarm-conductor mcp-server [options]
```

**Options:**
- `--port <number>`: Server port (default: 8080)
- `--host <address>`: Server host (default: localhost)
- `--auth <type>`: Authentication type (none, basic, jwt)
- `--cors`: Enable CORS
- `--ssl-cert <path>`: SSL certificate path
- `--ssl-key <path>`: SSL key path

### list

List available checkpoints or running swarms.

```bash
swarm-conductor list <type> [options]
```

**Types:**
- `checkpoints`: List saved checkpoints
- `swarms`: List running swarms
- `agents`: List available agents

**Options:**
- `--format <type>`: Output format (table, json, yaml)
- `--filter <expression>`: Filter results
- `--sort <field>`: Sort by field

### status

Show current swarm status.

```bash
swarm-conductor status [swarm-id] [options]
```

**Options:**
- `--watch`: Continuously update status
- `--format <type>`: Output format (simple, detailed, json)

## MCP Server API

### GET /api/v1/swarms

List all active swarms.

**Response:**
```json
{
  "swarms": [
    {
      "id": "swarm-123",
      "phase": "executing",
      "confidence": 0.87,
      "agentCount": 5,
      "taskProgress": {
        "total": 10,
        "completed": 6,
        "inProgress": 2,
        "pending": 2
      }
    }
  ]
}
```

### POST /api/v1/swarms

Create a new swarm.

**Request:**
```json
{
  "task": "Build authentication system",
  "agents": ["architect", "developer", "tester"],
  "confidenceThreshold": 0.8
}
```

**Response:**
```json
{
  "id": "swarm-456",
  "status": "created",
  "checkpointId": "checkpoint-789"
}
```

### GET /api/v1/swarms/{id}

Get swarm details.

**Response:**
```json
{
  "id": "swarm-123",
  "state": {
    "phase": "executing",
    "confidence": 0.87,
    "context": "Building user authentication",
    "tasks": [...],
    "agents": [...]
  }
}
```

### PUT /api/v1/swarms/{id}/pause

Pause a running swarm.

### PUT /api/v1/swarms/{id}/resume

Resume a paused swarm.

### DELETE /api/v1/swarms/{id}

Terminate a swarm.

### GET /api/v1/checkpoints

List available checkpoints.

### GET /api/v1/checkpoints/{id}

Get checkpoint details.

### WebSocket /ws/v1/swarms/{id}

Real-time swarm updates.

**Events:**
- `state-update`: Swarm state changed
- `task-completed`: Task finished
- `agent-status`: Agent status changed
- `error`: Error occurred

## Configuration

### Configuration File Schema

```typescript
interface SwarmConfig {
  // General settings
  readonly confidence_threshold: number;      // 0-1, default: 0.8
  readonly max_parallel_swarms: number;       // default: 5
  readonly checkpoint_interval: number;       // seconds, default: 300
  readonly max_sprint_depth: number;          // default: 3
  
  // MCP Server settings
  readonly mcp_server: {
    readonly enabled: boolean;
    readonly port: number;
    readonly host: string;
    readonly auth: AuthConfig;
  };
  
  // Agent configuration
  readonly agents: {
    readonly default: readonly AgentType[];
    readonly specialized: Record<string, readonly AgentType[]>;
    readonly max_per_swarm: number;
  };
  
  // SPARC phases
  readonly phases: readonly SPARCPhase[];
  readonly phase_timeouts: Record<SPARCPhase, number>;
  
  // Storage settings
  readonly storage: {
    readonly checkpoint_dir: string;
    readonly max_checkpoints: number;
    readonly compression: boolean;
  };
  
  // Logging
  readonly logging: {
    readonly level: 'debug' | 'info' | 'warn' | 'error';
    readonly file: string;
    readonly format: 'json' | 'text';
  };
}
```

### Environment Variables

- `SWARM_CONDUCTOR_CONFIG`: Path to configuration file
- `SWARM_CONDUCTOR_PORT`: MCP server port
- `SWARM_CONDUCTOR_LOG_LEVEL`: Logging level
- `SWARM_CONDUCTOR_CHECKPOINT_DIR`: Checkpoint directory
- `SWARM_CONDUCTOR_CLAUDE_FLOW_PATH`: Path to claude-flow executable

## Error Handling

### Error Types

```typescript
class SwarmError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly details?: unknown
  ) {
    super(message);
  }
}

enum ErrorCode {
  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  MISSING_AGENTS = 'MISSING_AGENTS',
  
  // Runtime errors
  AGENT_FAILURE = 'AGENT_FAILURE',
  CHECKPOINT_FAILURE = 'CHECKPOINT_FAILURE',
  TIMEOUT = 'TIMEOUT',
  
  // State errors
  INVALID_STATE = 'INVALID_STATE',
  CONFIDENCE_TOO_LOW = 'CONFIDENCE_TOO_LOW',
  MAX_DEPTH_EXCEEDED = 'MAX_DEPTH_EXCEEDED',
  
  // Network errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  MCP_SERVER_ERROR = 'MCP_SERVER_ERROR'
}
```

### Error Recovery

```typescript
// Automatic retry with exponential backoff
const retryConfig = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  factor: 2
};

// Circuit breaker pattern
const circuitBreaker = {
  threshold: 5,        // failures before opening
  timeout: 60000,      // ms before half-open
  resetTimeout: 120000 // ms before closing
};
```

### Error Handling Best Practices

1. **Always use Result type**: Never throw exceptions in pure functions
2. **Provide context**: Include relevant state in error details
3. **Log at appropriate level**: Use debug for expected errors
4. **User-friendly messages**: Transform technical errors for CLI output
5. **Recovery strategies**: Implement automatic recovery where possible