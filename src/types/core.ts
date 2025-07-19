/**
 * Core types for Swarm Conductor
 * All types are immutable using 'as const' pattern
 */

/**
 * Represents an AI agent node in the swarm
 */
export interface Node {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly capabilities: readonly string[];
  readonly state: 'idle' | 'thinking' | 'executing' | 'waiting' | 'complete';
  readonly dependencies: readonly string[];
  readonly confidence: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Sprint execution phases following SPARC methodology
 */
export const PHASES = {
  SPECIFICATION: 'specification',
  PSEUDOCODE: 'pseudocode',
  ARCHITECTURE: 'architecture',
  REFINEMENT: 'refinement',
  COMPLETION: 'completion'
} as const;

export type Phase = typeof PHASES[keyof typeof PHASES];

/**
 * Immutable sprint state representing the current execution state
 */
export interface SprintState {
  readonly id: string;
  readonly phase: Phase;
  readonly nodes: ReadonlyArray<Node>;
  readonly globalContext: Readonly<{
    readonly objective: string;
    readonly constraints: readonly string[];
    readonly resources: Readonly<{
      readonly timeLimit: number;
      readonly tokenLimit: number;
      readonly memoryLimit: number;
    }>;
  }>;
  readonly history: ReadonlyArray<{
    readonly timestamp: number;
    readonly phase: Phase;
    readonly action: string;
    readonly nodeId: string;
    readonly result: unknown;
  }>;
  readonly metrics: Readonly<{
    readonly startTime: number;
    readonly elapsedTime: number;
    readonly tokensUsed: number;
    readonly successRate: number;
    readonly confidence: number;
  }>;
  readonly status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
}

/**
 * Action types for state transitions
 */
export const ACTIONS = {
  // Sprint actions
  START_SPRINT: 'START_SPRINT',
  PAUSE_SPRINT: 'PAUSE_SPRINT',
  RESUME_SPRINT: 'RESUME_SPRINT',
  COMPLETE_SPRINT: 'COMPLETE_SPRINT',
  FAIL_SPRINT: 'FAIL_SPRINT',
  
  // Phase actions
  ADVANCE_PHASE: 'ADVANCE_PHASE',
  RETRY_PHASE: 'RETRY_PHASE',
  
  // Node actions
  ADD_NODE: 'ADD_NODE',
  UPDATE_NODE: 'UPDATE_NODE',
  REMOVE_NODE: 'REMOVE_NODE',
  
  // Context actions
  UPDATE_CONTEXT: 'UPDATE_CONTEXT',
  ADD_CONSTRAINT: 'ADD_CONSTRAINT',
  UPDATE_RESOURCES: 'UPDATE_RESOURCES',
  
  // History actions
  ADD_HISTORY: 'ADD_HISTORY',
  
  // Metrics actions
  UPDATE_METRICS: 'UPDATE_METRICS'
} as const;

export type ActionType = typeof ACTIONS[keyof typeof ACTIONS];

/**
 * Base action interface
 */
export interface Action<T = unknown> {
  readonly type: ActionType;
  readonly payload: T;
  readonly timestamp: number;
  readonly nodeId?: string;
}

/**
 * Type guard for Node
 */
export const isNode = (value: unknown): value is Node => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    'role' in value &&
    'capabilities' in value &&
    'state' in value
  );
};

/**
 * Type guard for SprintState
 */
export const isSprintState = (value: unknown): value is SprintState => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'phase' in value &&
    'nodes' in value &&
    'globalContext' in value &&
    'status' in value
  );
};

/**
 * Phase transition rules
 */
export const PHASE_TRANSITIONS: Readonly<Record<Phase, readonly Phase[]>> = {
  [PHASES.SPECIFICATION]: [PHASES.PSEUDOCODE],
  [PHASES.PSEUDOCODE]: [PHASES.ARCHITECTURE, PHASES.SPECIFICATION],
  [PHASES.ARCHITECTURE]: [PHASES.REFINEMENT, PHASES.PSEUDOCODE],
  [PHASES.REFINEMENT]: [PHASES.COMPLETION, PHASES.ARCHITECTURE],
  [PHASES.COMPLETION]: []
} as const;

/**
 * Check if a phase transition is valid
 */
export const isValidTransition = (from: Phase, to: Phase): boolean => {
  return PHASE_TRANSITIONS[from].includes(to);
};