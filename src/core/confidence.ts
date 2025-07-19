import { SwarmState, Task, Agent } from '../types/cli';

// Confidence factors with weights
interface ConfidenceFactors {
  taskCompletion: number;     // Weight: 0.3
  agentUtilization: number;   // Weight: 0.2
  taskFailureRate: number;    // Weight: 0.2
  phaseIterations: number;    // Weight: 0.15
  contextClarity: number;     // Weight: 0.15
}

// Pure function to calculate overall confidence
export function calculateConfidence(state: SwarmState): number {
  const factors = calculateConfidenceFactors(state);
  
  // Weighted average of factors
  const confidence = 
    factors.taskCompletion * 0.3 +
    factors.agentUtilization * 0.2 +
    (1 - factors.taskFailureRate) * 0.2 +
    factors.phaseIterations * 0.15 +
    factors.contextClarity * 0.15;

  // Ensure confidence is between 0 and 1
  return Math.max(0, Math.min(1, confidence));
}

// Pure function to calculate individual confidence factors
function calculateConfidenceFactors(state: SwarmState): ConfidenceFactors {
  return {
    taskCompletion: calculateTaskCompletionFactor(state.tasks),
    agentUtilization: calculateAgentUtilizationFactor(state.agents),
    taskFailureRate: calculateTaskFailureFactor(state.tasks),
    phaseIterations: calculatePhaseIterationFactor(state),
    contextClarity: calculateContextClarityFactor(state.context)
  };
}

// Calculate task completion factor (0-1)
function calculateTaskCompletionFactor(tasks: readonly Task[]): number {
  if (tasks.length === 0) return 0.5; // Neutral if no tasks

  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = tasks.length;
  
  return completed / total;
}

// Calculate agent utilization factor (0-1)
function calculateAgentUtilizationFactor(agents: readonly Agent[]): number {
  if (agents.length === 0) return 0;

  const busyAgents = agents.filter(a => a.status === 'busy').length;
  const totalAgents = agents.length;
  
  // Optimal utilization is around 80%
  const utilization = busyAgents / totalAgents;
  
  if (utilization <= 0.8) {
    return utilization / 0.8;
  } else {
    // Penalize over-utilization
    return 1 - ((utilization - 0.8) / 0.2) * 0.2;
  }
}

// Calculate task failure factor (0-1, lower is better)
function calculateTaskFailureFactor(tasks: readonly Task[]): number {
  if (tasks.length === 0) return 0;

  const failed = tasks.filter(t => t.status === 'failed').length;
  const attempted = tasks.filter(t => 
    t.status === 'completed' || 
    t.status === 'failed'
  ).length;
  
  if (attempted === 0) return 0;
  
  return failed / attempted;
}

// Calculate phase iteration factor (0-1, penalizes repeated phases)
function calculatePhaseIterationFactor(state: SwarmState): number {
  const currentPhase = state.phase;
  
  // Count how many times we've been in this phase
  const phaseCount = state.previousStates.filter(
    s => s.phase === currentPhase
  ).length + 1;
  
  // Penalize multiple iterations of the same phase
  switch (phaseCount) {
    case 1: return 1.0;
    case 2: return 0.8;
    case 3: return 0.6;
    case 4: return 0.4;
    default: return 0.2;
  }
}

// Calculate context clarity factor (0-1)
function calculateContextClarityFactor(context: string): number {
  // Simple heuristic based on context length and content
  const words = context.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length < 5) return 0.2;  // Too short
  if (words.length > 500) return 0.7; // Too long
  
  // Check for clarity indicators
  let clarity = 0.5;
  
  // Bonus for structured content
  if (context.includes(':') || context.includes('-')) clarity += 0.1;
  if (context.includes('\n')) clarity += 0.1;
  
  // Bonus for technical terms (simple check)
  const technicalTerms = ['implement', 'build', 'create', 'develop', 'test', 'deploy'];
  const hasTechnicalTerms = technicalTerms.some(term => 
    context.toLowerCase().includes(term)
  );
  if (hasTechnicalTerms) clarity += 0.2;
  
  // Penalty for vague terms
  const vagueTerms = ['something', 'stuff', 'thing', 'whatever'];
  const hasVagueTerms = vagueTerms.some(term => 
    context.toLowerCase().includes(term)
  );
  if (hasVagueTerms) clarity -= 0.1;
  
  return Math.max(0, Math.min(1, clarity));
}

// Pure function to get confidence trend
export function getConfidenceTrend(states: readonly SwarmState[]): 'improving' | 'declining' | 'stable' {
  if (states.length < 3) return 'stable';
  
  const recentStates = states.slice(-3);
  const confidences = recentStates.map(calculateConfidence);
  
  const firstConf = confidences[0];
  const lastConf = confidences[confidences.length - 1];
  const diff = (lastConf || 0) - (firstConf || 0);
  
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}

// Pure function to get confidence recommendations
export function getConfidenceRecommendations(state: SwarmState): string[] {
  const factors = calculateConfidenceFactors(state);
  const recommendations: string[] = [];
  
  if (factors.taskCompletion < 0.5) {
    recommendations.push('Focus on completing more tasks to improve confidence');
  }
  
  if (factors.agentUtilization < 0.6) {
    recommendations.push('Assign more tasks to idle agents');
  } else if (factors.agentUtilization > 0.9) {
    recommendations.push('Agents are overloaded - consider redistributing tasks');
  }
  
  if (factors.taskFailureRate > 0.2) {
    recommendations.push('High failure rate detected - review task requirements');
  }
  
  if (factors.phaseIterations < 0.6) {
    recommendations.push('Multiple phase iterations detected - consider adjusting approach');
  }
  
  if (factors.contextClarity < 0.5) {
    recommendations.push('Context could be clearer - consider refining requirements');
  }
  
  return recommendations;
}