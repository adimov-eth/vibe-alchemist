import { SPARCPhase, Task, Agent } from '../types/cli';

// Base action interface
export interface Action<T = any> {
  type: string;
  payload: T;
  timestamp: number;
  metadata?: Record<string, any>;
}

// Specific action types for state management
export interface TransitionPhaseAction extends Action<{ phase: SPARCPhase }> {
  type: 'TRANSITION_PHASE';
}

export interface UpdateConfidenceAction extends Action<{ confidence: number }> {
  type: 'UPDATE_CONFIDENCE';
}

export interface AddTaskAction extends Action<{ task: Task }> {
  type: 'ADD_TASK';
}

export interface UpdateTaskAction extends Action<{ 
  taskId: string; 
  updates: Partial<Task>;
}> {
  type: 'UPDATE_TASK';
}

export interface AssignTaskAction extends Action<{
  taskId: string;
  agentId: string;
}> {
  type: 'ASSIGN_TASK';
}

export interface UpdateAgentAction extends Action<{
  agentId: string;
  updates: Partial<Agent>;
}> {
  type: 'UPDATE_AGENT';
}

// Union type for all actions
export type SwarmAction =
  | TransitionPhaseAction
  | UpdateConfidenceAction
  | AddTaskAction
  | UpdateTaskAction
  | AssignTaskAction
  | UpdateAgentAction;

// Action creators (pure functions)
export const actions = {
  transitionPhase: (phase: SPARCPhase): TransitionPhaseAction => ({
    type: 'TRANSITION_PHASE',
    payload: { phase },
    timestamp: Date.now()
  }),

  updateConfidence: (confidence: number): UpdateConfidenceAction => ({
    type: 'UPDATE_CONFIDENCE',
    payload: { confidence },
    timestamp: Date.now()
  }),

  addTask: (task: Task): AddTaskAction => ({
    type: 'ADD_TASK',
    payload: { task },
    timestamp: Date.now()
  }),

  updateTask: (taskId: string, updates: Partial<Task>): UpdateTaskAction => ({
    type: 'UPDATE_TASK',
    payload: { taskId, updates },
    timestamp: Date.now()
  }),

  assignTask: (taskId: string, agentId: string): AssignTaskAction => ({
    type: 'ASSIGN_TASK',
    payload: { taskId, agentId },
    timestamp: Date.now()
  }),

  updateAgent: (agentId: string, updates: Partial<Agent>): UpdateAgentAction => ({
    type: 'UPDATE_AGENT',
    payload: { agentId, updates },
    timestamp: Date.now()
  })
};

// Action type guards
export const isTransitionPhaseAction = (action: SwarmAction): action is TransitionPhaseAction =>
  action.type === 'TRANSITION_PHASE';

export const isUpdateConfidenceAction = (action: SwarmAction): action is UpdateConfidenceAction =>
  action.type === 'UPDATE_CONFIDENCE';

export const isAddTaskAction = (action: SwarmAction): action is AddTaskAction =>
  action.type === 'ADD_TASK';

export const isUpdateTaskAction = (action: SwarmAction): action is UpdateTaskAction =>
  action.type === 'UPDATE_TASK';

export const isAssignTaskAction = (action: SwarmAction): action is AssignTaskAction =>
  action.type === 'ASSIGN_TASK';

export const isUpdateAgentAction = (action: SwarmAction): action is UpdateAgentAction =>
  action.type === 'UPDATE_AGENT';

// Action validation
export function validateAction(action: SwarmAction): { valid: boolean; error?: string } {
  switch (action.type) {
    case 'TRANSITION_PHASE': {
      const validPhases: SPARCPhase[] = ['planning', 'executing', 'testing', 'refactoring', 'completing'];
      if (!validPhases.includes(action.payload.phase)) {
        return { valid: false, error: `Invalid phase: ${action.payload.phase}` };
      }
      break;
    }
    
    case 'UPDATE_CONFIDENCE': {
      const { confidence } = action.payload;
      if (confidence < 0 || confidence > 1) {
        return { valid: false, error: 'Confidence must be between 0 and 1' };
      }
      break;
    }
    
    case 'ADD_TASK': {
      const { task } = action.payload;
      if (!task.id || !task.description) {
        return { valid: false, error: 'Task must have id and description' };
      }
      break;
    }
    
    case 'UPDATE_TASK': {
      const { taskId } = action.payload;
      if (!taskId) {
        return { valid: false, error: 'Task ID is required' };
      }
      break;
    }
    
    case 'ASSIGN_TASK': {
      const { taskId, agentId } = action.payload;
      if (!taskId || !agentId) {
        return { valid: false, error: 'Both task ID and agent ID are required' };
      }
      break;
    }
    
    case 'UPDATE_AGENT': {
      const { agentId } = action.payload;
      if (!agentId) {
        return { valid: false, error: 'Agent ID is required' };
      }
      break;
    }
  }
  
  return { valid: true };
}