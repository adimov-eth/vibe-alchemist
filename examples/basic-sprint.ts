/**
 * Basic Sprint Example
 * 
 * This example demonstrates how to use Swarm Conductor to run a basic sprint
 * with multiple agents working on a task.
 */

import { conductor, type SprintConfig, type Result } from '@swarm/conductor';
import chalk from 'chalk';

// Helper function to log results
function logResult<T>(result: Result<T>, label: string): void {
  if (result.ok) {
    console.log(chalk.green(`✅ ${label}: Success`));
    console.log(chalk.gray(JSON.stringify(result.value, null, 2)));
  } else {
    console.log(chalk.red(`❌ ${label}: Failed`));
    console.log(chalk.red(result.error.message));
  }
}

async function runBasicSprint() {
  console.log(chalk.blue.bold('\n🎼 Swarm Conductor - Basic Sprint Example\n'));

  // Define the sprint configuration
  const config: SprintConfig = {
    task: "Create a user authentication system with JWT tokens",
    agents: ['architect', 'developer', 'tester'],
    confidenceThreshold: 0.8,
    checkpointInterval: 60, // Save checkpoint every minute
    metadata: {
      project: 'auth-system',
      priority: 'high'
    }
  };

  console.log(chalk.yellow('📋 Sprint Configuration:'));
  console.log(chalk.gray(JSON.stringify(config, null, 2)));
  console.log();

  // Start the sprint
  console.log(chalk.yellow('🚀 Starting sprint...'));
  const startTime = Date.now();
  
  const result = await conductor.startSprint(config);
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(chalk.gray(`\n⏱️  Sprint duration: ${duration}s\n`));

  if (result.ok) {
    const state = result.value;
    
    // Display sprint results
    console.log(chalk.green.bold('✅ Sprint completed successfully!\n'));
    
    console.log(chalk.cyan('📊 Final State:'));
    console.log(`  • Phase: ${chalk.bold(state.phase)}`);
    console.log(`  • Confidence: ${chalk.bold(state.confidence.toFixed(2))}`);
    console.log(`  • Total Tasks: ${chalk.bold(state.tasks.length)}`);
    
    // Task breakdown
    const tasksByStatus = state.tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log(chalk.cyan('\n📈 Task Status Breakdown:'));
    Object.entries(tasksByStatus).forEach(([status, count]) => {
      const emoji = status === 'completed' ? '✅' : 
                    status === 'failed' ? '❌' : 
                    status === 'in-progress' ? '🔄' : '⏳';
      console.log(`  ${emoji} ${status}: ${count}`);
    });
    
    // Agent performance
    console.log(chalk.cyan('\n🤖 Agent Performance:'));
    state.agents.forEach(agent => {
      const statusEmoji = agent.status === 'idle' ? '😴' : 
                         agent.status === 'busy' ? '🔥' : 
                         agent.status === 'error' ? '❌' : '❓';
      console.log(`  • ${agent.name} (${agent.type}): ${statusEmoji} ${agent.status}`);
      console.log(`    Tasks completed: ${agent.performance.tasksCompleted}`);
      console.log(`    Avg confidence: ${agent.performance.averageConfidence.toFixed(2)}`);
    });
    
    // Show some completed tasks
    const completedTasks = state.tasks
      .filter(t => t.status === 'completed')
      .slice(0, 5);
    
    if (completedTasks.length > 0) {
      console.log(chalk.cyan('\n✨ Sample Completed Tasks:'));
      completedTasks.forEach(task => {
        console.log(`  • ${task.description}`);
      });
    }
    
    // Checkpoint info
    if (state.checkpoint) {
      console.log(chalk.cyan('\n💾 Checkpoint Information:'));
      console.log(`  • ID: ${state.checkpoint.id}`);
      console.log(`  • Created: ${new Date(state.checkpoint.createdAt).toLocaleString()}`);
      console.log(`  • Size: ${(state.checkpoint.size / 1024).toFixed(2)} KB`);
      console.log(chalk.gray(`\n  You can resume from this checkpoint using:`));
      console.log(chalk.gray(`  swarm-conductor resume ${state.checkpoint.id}`));
    }
    
  } else {
    console.log(chalk.red.bold('❌ Sprint failed!\n'));
    console.log(chalk.red('Error:', result.error.message));
    
    if ('code' in result.error) {
      console.log(chalk.red('Error Code:', (result.error as any).code));
    }
    
    if ('details' in result.error) {
      console.log(chalk.red('\nError Details:'));
      console.log(chalk.gray(JSON.stringify((result.error as any).details, null, 2)));
    }
  }
}

// Advanced example with parallel swarms
async function runParallelSwarms() {
  console.log(chalk.blue.bold('\n\n🎼 Swarm Conductor - Parallel Swarms Example\n'));

  const swarmConfigs: SprintConfig[] = [
    {
      task: "Design and implement user interface components",
      agents: ['architect', 'developer'],
      confidenceThreshold: 0.85
    },
    {
      task: "Create backend API with database integration",
      agents: ['architect', 'developer', 'tester'],
      confidenceThreshold: 0.8
    },
    {
      task: "Setup CI/CD pipeline and deployment infrastructure",
      agents: ['developer', 'tester'],
      confidenceThreshold: 0.75
    }
  ];

  console.log(chalk.yellow(`🔄 Starting ${swarmConfigs.length} parallel swarms...\n`));

  const startTime = Date.now();
  const results = await conductor.orchestrateSwarms(swarmConfigs);
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(chalk.gray(`\n⏱️  Total duration: ${duration}s\n`));

  if (results.ok) {
    console.log(chalk.green.bold(`✅ All ${results.value.length} swarms completed!\n`));
    
    results.value.forEach((state, index) => {
      console.log(chalk.cyan(`\n📊 Swarm ${index + 1} Results:`));
      console.log(`  • Task: "${swarmConfigs[index].task}"`);
      console.log(`  • Final Phase: ${state.phase}`);
      console.log(`  • Confidence: ${state.confidence.toFixed(2)}`);
      console.log(`  • Tasks Completed: ${state.tasks.filter(t => t.status === 'completed').length}/${state.tasks.length}`);
    });
  } else {
    console.log(chalk.red.bold('❌ Parallel execution failed!'));
    console.log(chalk.red('Error:', results.error.message));
  }
}

// Run examples
async function main() {
  try {
    // Run basic sprint
    await runBasicSprint();
    
    // Uncomment to run parallel swarms example
    // await runParallelSwarms();
    
  } catch (error) {
    console.error(chalk.red.bold('\n💥 Unexpected error:'), error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.main) {
  main();
}