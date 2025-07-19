import { Result, ok, err } from '../types/result';
import { SwarmState, SPARCPhase, Task, Agent } from '../types/cli';
import { generateId } from '../utils/id';

/**
 * Creates the initial state for a new swarm.
 * This is a pure function that generates a fresh state with idle agents.
 * 
 * @param options - Configuration options
 * @param options.context - The task context/description for the swarm
 * @param options.agentCount - Number of agents to create
 * @returns A new SwarmState with initial values
 * 
 * @example
 * ```typescript
 * const state = createInitialState({
 *   context: "Build authentication system",
 *   agentCount: 5
 * });
 * ```
 */
export function createInitialState(options: {
  context: string;
  agentCount: number;
}): SwarmState {
  const id = generateId();
  
  return {
    id,
    phase: 'planning',
    confidence: 0.5,
    context: options.context,
    previousStates: [],
    tasks: [],
    agents: createInitialAgents(options.agentCount)
  };
}

// Pure function to create initial agents
function createInitialAgents(count: number): Agent[] {
  const agentTypes: Agent['type'][] = ['architect', 'developer', 'tester', 'reviewer', 'coordinator'];
  const agents: Agent[] = [];

  for (let i = 0; i < count; i++) {
    const type = agentTypes[i % agentTypes.length] as Agent['type'];
    agents.push({
      id: generateId(),
      name: `${type}-${i + 1}`,
      type,
      status: 'idle',
      currentTask: undefined
    });
  }

  return agents;
}

// Pure reducer function for state transitions
export function reduceState(
  state: SwarmState,
  action: StateAction
): Result<SwarmState, Error> {
  switch (action.type) {
    case 'TRANSITION_PHASE':
      return transitionPhase(state, action.phase);
    
    case 'UPDATE_CONFIDENCE':
      return updateConfidence(state, action.confidence);
    
    case 'ADD_TASK':
      return addTask(state, action.task);
    
    case 'UPDATE_TASK':
      return updateTask(state, action.taskId, action.updates);
    
    case 'ASSIGN_TASK':
      return assignTask(state, action.taskId, action.agentId);
    
    case 'UPDATE_AGENT':
      return updateAgent(state, action.agentId, action.updates);
    
    default:
      return err(new Error(`Unknown action type`));
  }
}

// Action types
export type StateAction =
  | { type: 'TRANSITION_PHASE'; phase: SPARCPhase }
  | { type: 'UPDATE_CONFIDENCE'; confidence: number }
  | { type: 'ADD_TASK'; task: Task }
  | { type: 'UPDATE_TASK'; taskId: string; updates: Partial<Task> }
  | { type: 'ASSIGN_TASK'; taskId: string; agentId: string }
  | { type: 'UPDATE_AGENT'; agentId: string; updates: Partial<Agent> };

// Pure function to transition phases
function transitionPhase(
  state: SwarmState,
  newPhase: SPARCPhase
): Result<SwarmState, Error> {
  // Validate phase transition
  const validTransitions: Record<SPARCPhase, SPARCPhase[]> = {
    planning: ['executing'],
    executing: ['testing', 'planning'],
    testing: ['refactoring', 'executing'],
    refactoring: ['testing', 'completing'],
    completing: []
  };

  if (!validTransitions[state.phase].includes(newPhase)) {
    return err(new Error(`Invalid phase transition from ${state.phase} to ${newPhase}`));
  }

  return ok({
    ...state,
    phase: newPhase,
    previousStates: [...state.previousStates, state]
  });
}

// Pure function to update confidence
function updateConfidence(
  state: SwarmState,
  confidence: number
): Result<SwarmState, Error> {
  if (confidence < 0 || confidence > 1) {
    return err(new Error('Confidence must be between 0 and 1'));
  }

  return ok({
    ...state,
    confidence
  });
}

// Pure function to add a task
function addTask(
  state: SwarmState,
  task: Task
): Result<SwarmState, Error> {
  return ok({
    ...state,
    tasks: [...state.tasks, task]
  });
}

// Pure function to update a task
function updateTask(
  state: SwarmState,
  taskId: string,
  updates: Partial<Task>
): Result<SwarmState, Error> {
  const taskIndex = state.tasks.findIndex(t => t.id === taskId);
  
  if (taskIndex === -1) {
    return err(new Error(`Task ${taskId} not found`));
  }

  const updatedTasks = [...state.tasks];
  updatedTasks[taskIndex] = {
    ...updatedTasks[taskIndex],
    ...updates
  } as Task;

  return ok({
    ...state,
    tasks: updatedTasks
  });
}

// Pure function to assign a task to an agent
function assignTask(
  state: SwarmState,
  taskId: string,
  agentId: string
): Result<SwarmState, Error> {
  const taskResult = updateTask(state, taskId, { assignedTo: agentId });
  if (taskResult.kind === 'err') return taskResult;

  const agentResult = updateAgent(taskResult.value, agentId, { 
    currentTask: taskId,
    status: 'busy'
  });

  return agentResult;
}

// Pure function to update an agent
function updateAgent(
  state: SwarmState,
  agentId: string,
  updates: Partial<Agent>
): Result<SwarmState, Error> {
  const agentIndex = state.agents.findIndex(a => a.id === agentId);
  
  if (agentIndex === -1) {
    return err(new Error(`Agent ${agentId} not found`));
  }

  const updatedAgents = [...state.agents];
  updatedAgents[agentIndex] = {
    ...updatedAgents[agentIndex],
    ...updates
  } as Agent;

  return ok({
    ...state,
    agents: updatedAgents
  });
}