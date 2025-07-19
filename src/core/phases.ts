import { Result, ok } from '../types/result';
import { SPARCPhase, SwarmState } from '../types/cli';
import { calculateConfidence } from './confidence';

// Phase transition criteria
export interface PhaseTransitionCriteria {
  minConfidence: number;
  requiredCompletions: number;
  maxIterations?: number;
}

// Default criteria for each phase
export const PHASE_CRITERIA: Record<SPARCPhase, PhaseTransitionCriteria> = {
  planning: {
    minConfidence: 0.7,
    requiredCompletions: 1, // Planning tasks completed
    maxIterations: 3
  },
  executing: {
    minConfidence: 0.6,
    requiredCompletions: 0.8, // 80% of tasks completed
    maxIterations: 5
  },
  testing: {
    minConfidence: 0.8,
    requiredCompletions: 1, // All tests passed
    maxIterations: 3
  },
  refactoring: {
    minConfidence: 0.85,
    requiredCompletions: 1, // Refactoring complete
    maxIterations: 2
  },
  completing: {
    minConfidence: 0.9,
    requiredCompletions: 1,
    maxIterations: 1
  }
};

// Pure function to determine if phase transition should occur
export function shouldTransitionPhase(
  state: SwarmState,
  criteria?: Partial<PhaseTransitionCriteria>
): Result<{ shouldTransition: boolean; nextPhase?: SPARCPhase; reason: string }, Error> {
  const currentCriteria = {
    ...PHASE_CRITERIA[state.phase],
    ...criteria
  };

  // Calculate current confidence
  const confidence = calculateConfidence(state);

  // Check confidence threshold
  if (confidence < currentCriteria.minConfidence) {
    return ok({
      shouldTransition: false,
      reason: `Confidence ${confidence} below minimum ${currentCriteria.minConfidence}`
    });
  }

  // Check task completions
  const completionRate = calculateCompletionRate(state);
  if (completionRate < currentCriteria.requiredCompletions) {
    return ok({
      shouldTransition: false,
      reason: `Completion rate ${completionRate} below required ${currentCriteria.requiredCompletions}`
    });
  }

  // Determine next phase
  const nextPhase = getNextPhase(state);
  if (!nextPhase) {
    return ok({
      shouldTransition: false,
      reason: 'No valid next phase available'
    });
  }

  return ok({
    shouldTransition: true,
    nextPhase,
    reason: 'All criteria met for phase transition'
  });
}

// Pure function to get the next phase based on current state
export function getNextPhase(state: SwarmState): SPARCPhase | null {
  switch (state.phase) {
    case 'planning':
      return 'executing';
    
    case 'executing':
      // If confidence is low, go back to planning
      if (state.confidence < 0.5) {
        return 'planning';
      }
      return 'testing';
    
    case 'testing':
      // If tests fail significantly, go back to executing
      const testFailureRate = calculateTestFailureRate(state);
      if (testFailureRate > 0.3) {
        return 'executing';
      }
      return 'refactoring';
    
    case 'refactoring':
      // Always go to testing after refactoring
      return 'testing';
    
    case 'completing':
      // Terminal phase
      return null;
    
    default:
      return null;
  }
}

// Pure function to calculate task completion rate
function calculateCompletionRate(state: SwarmState): number {
  if (state.tasks.length === 0) {
    return 0;
  }

  const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
  return completedTasks / state.tasks.length;
}

// Pure function to calculate test failure rate
function calculateTestFailureRate(state: SwarmState): number {
  const testTasks = state.tasks.filter(t => 
    t.description.toLowerCase().includes('test')
  );

  if (testTasks.length === 0) {
    return 0;
  }

  const failedTests = testTasks.filter(t => t.status === 'failed').length;
  return failedTests / testTasks.length;
}

// Pure function to get phase-specific prompts
export function getPhasePrompt(phase: SPARCPhase): string {
  const prompts: Record<SPARCPhase, string> = {
    planning: `You are in the PLANNING phase. Focus on:
- Understanding the problem thoroughly
- Breaking down into clear, actionable tasks
- Identifying dependencies and risks
- Creating a comprehensive plan`,

    executing: `You are in the EXECUTING phase. Focus on:
- Implementing the planned tasks
- Following best practices
- Maintaining code quality
- Tracking progress and blockers`,

    testing: `You are in the TESTING phase. Focus on:
- Writing comprehensive tests
- Validating functionality
- Finding edge cases
- Ensuring reliability`,

    refactoring: `You are in the REFACTORING phase. Focus on:
- Improving code structure
- Reducing complexity
- Enhancing performance
- Maintaining functionality`,

    completing: `You are in the COMPLETING phase. Focus on:
- Final validation
- Documentation
- Cleanup
- Delivery preparation`
  };

  return prompts[phase];
}