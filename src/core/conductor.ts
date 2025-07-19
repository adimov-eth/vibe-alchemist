import { Result, isErr, ok, err } from '../types/result';
import { SwarmState } from '../types/cli';
import { getPhasePrompt, shouldTransitionPhase } from './phases';
import { calculateConfidence } from './confidence';
import { reduceState } from './state';
import { actions } from './actions';
import { saveState } from './persistence';

export interface ConductorOptions {
  debug: boolean;
  mcpPort?: number;
  isResume?: boolean;
}

// Main conductor function that orchestrates the swarm
export async function runSwarm(
  initialState: SwarmState,
  options: ConductorOptions
): Promise<Result<void, Error>> {
  try {
    let currentState = initialState;
    
    // Main conductor loop
    while (currentState.phase !== 'completing') {
      if (options.debug) {
        console.log(`\n=== Phase: ${currentState.phase} ===`);
        console.log(`Confidence: ${currentState.confidence}`);
        console.log(getPhasePrompt(currentState.phase));
      }
      
      // Update confidence
      const newConfidence = calculateConfidence(currentState);
      const confidenceResult = reduceState(
        currentState, 
        { type: 'UPDATE_CONFIDENCE', confidence: newConfidence }
      );
      
      if (isErr(confidenceResult)) {
        return confidenceResult;
      }
      currentState = confidenceResult.value;
      
      // Check for phase transition
      const transitionResult = shouldTransitionPhase(currentState);
      if (isErr(transitionResult)) {
        return transitionResult;
      }
      
      if (transitionResult.value.shouldTransition && transitionResult.value.nextPhase) {
        const phaseResult = reduceState(
          currentState,
          { type: 'TRANSITION_PHASE', phase: transitionResult.value.nextPhase }
        );
        
        if (isErr(phaseResult)) {
          return phaseResult;
        }
        currentState = phaseResult.value;
        
        // Save state after phase transition
        await saveState(currentState);
      }
      
      // TODO: Implement actual swarm orchestration logic
      // For now, this is a placeholder that prevents infinite loop
      if (currentState.tasks.length === 0) {
        // Add some sample tasks
        const sampleTask = {
          id: 'task-1',
          description: 'Sample task',
          status: 'completed' as const,
          dependencies: []
        };
        
        const taskResult = reduceState(
          currentState,
          { type: 'ADD_TASK', task: sampleTask }
        );
        
        if (isErr(taskResult)) {
          return taskResult;
        }
        currentState = taskResult.value;
      }
      
      // Move to completing phase for now
      const completeResult = reduceState(
        currentState,
        { type: 'TRANSITION_PHASE', phase: 'completing' }
      );
      
      if (isErr(completeResult)) {
        return completeResult;
      }
      currentState = completeResult.value;
    }
    
    // Save final state
    await saveState(currentState);
    
    return ok(undefined);
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
}