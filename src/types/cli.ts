// CLI-specific type definitions

export type SPARCPhase = 
  | 'planning' 
  | 'executing' 
  | 'testing' 
  | 'refactoring' 
  | 'completing';

export interface SwarmState {
  readonly id: string;
  readonly phase: SPARCPhase;
  readonly confidence: number;
  readonly context: string;
  readonly previousStates: readonly SwarmState[];
  readonly tasks: readonly Task[];
  readonly agents: readonly Agent[];
}

export interface Task {
  readonly id: string;
  readonly description: string;
  readonly status: TaskStatus;
  readonly assignedTo?: string;
  readonly dependencies: readonly string[];
}

export type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'failed';

export interface Agent {
  readonly id: string;
  readonly name: string;
  readonly type: AgentType;
  readonly status: AgentStatus;
  readonly currentTask?: string;
}

export type AgentType = 
  | 'architect' 
  | 'developer' 
  | 'tester' 
  | 'reviewer' 
  | 'coordinator';

export type AgentStatus = 'idle' | 'busy' | 'error';

export interface MCPServerConfig {
  readonly host: string;
  readonly port: number;
}

export interface CLIConfig {
  readonly resumeId?: string;
  readonly debug: boolean;
  readonly mcpPort?: number;
}