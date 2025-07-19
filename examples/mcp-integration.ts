/**
 * MCP Server Integration Example
 * 
 * This example demonstrates how to integrate Swarm Conductor with an MCP
 * (Model Context Protocol) server for external tool integration.
 */

import { conductor, MCPClient, type SwarmState } from '@swarm/conductor';
import chalk from 'chalk';

// MCP Server configuration
const MCP_CONFIG = {
  host: 'localhost',
  port: 8080,
  auth: {
    type: 'bearer',
    token: process.env.MCP_AUTH_TOKEN || 'demo-token'
  }
};

/**
 * Example 1: Starting a swarm via MCP API
 */
async function startSwarmViaMCP() {
  console.log(chalk.blue.bold('\n🔌 MCP Integration - Starting Swarm via API\n'));

  const client = new MCPClient(MCP_CONFIG);

  try {
    // Connect to MCP server
    console.log(chalk.yellow('Connecting to MCP server...'));
    await client.connect();
    console.log(chalk.green('✅ Connected to MCP server'));

    // Create a new swarm
    const swarmRequest = {
      task: "Implement a real-time chat application with WebSocket support",
      agents: ['architect', 'developer', 'developer', 'tester'],
      confidenceThreshold: 0.85,
      metadata: {
        project: 'chat-app',
        features: ['authentication', 'real-time messaging', 'file sharing']
      }
    };

    console.log(chalk.yellow('\n📤 Sending swarm creation request...'));
    const response = await client.createSwarm(swarmRequest);

    if (response.ok) {
      console.log(chalk.green('✅ Swarm created successfully!'));
      console.log(chalk.gray(`Swarm ID: ${response.value.id}`));
      console.log(chalk.gray(`Checkpoint ID: ${response.value.checkpointId}`));

      // Monitor swarm progress
      await monitorSwarmProgress(client, response.value.id);
    } else {
      console.log(chalk.red('❌ Failed to create swarm:'), response.error);
    }

  } catch (error) {
    console.error(chalk.red('💥 MCP connection error:'), error);
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 2: Real-time swarm monitoring via WebSocket
 */
async function monitorSwarmProgress(client: MCPClient, swarmId: string) {
  console.log(chalk.yellow('\n📊 Monitoring swarm progress...\n'));

  return new Promise<void>((resolve) => {
    // Subscribe to swarm events
    const unsubscribe = client.subscribeToSwarm(swarmId, (event) => {
      switch (event.type) {
        case 'state-update':
          const state = event.data as SwarmState;
          console.log(chalk.cyan(`[${new Date().toLocaleTimeString()}] State Update:`));
          console.log(`  • Phase: ${chalk.bold(state.phase)}`);
          console.log(`  • Confidence: ${chalk.bold(state.confidence.toFixed(2))}`);
          console.log(`  • Active Agents: ${state.agents.filter(a => a.status === 'busy').length}`);
          break;

        case 'task-completed':
          const task = event.data;
          console.log(chalk.green(`✅ Task completed: ${task.description}`));
          break;

        case 'agent-status':
          const agent = event.data;
          const emoji = agent.status === 'busy' ? '🔥' : 
                       agent.status === 'idle' ? '😴' : '❌';
          console.log(chalk.gray(`${emoji} Agent ${agent.name} is now ${agent.status}`));
          break;

        case 'error':
          console.log(chalk.red(`❌ Error: ${event.data.message}`));
          break;

        case 'completed':
          console.log(chalk.green.bold('\n✅ Swarm completed successfully!'));
          unsubscribe();
          resolve();
          break;
      }
    });

    // Set a timeout
    setTimeout(() => {
      console.log(chalk.yellow('\n⏱️  Monitoring timeout reached'));
      unsubscribe();
      resolve();
    }, 300000); // 5 minutes
  });
}

/**
 * Example 3: Using MCP tools within a sprint
 */
async function sprintWithMCPTools() {
  console.log(chalk.blue.bold('\n🛠️  Sprint with MCP Tools Integration\n'));

  // Configure MCP tools for the sprint
  const config = {
    task: "Analyze codebase and generate comprehensive documentation",
    agents: ['architect', 'developer', 'reviewer'],
    confidenceThreshold: 0.8,
    mcpTools: {
      enabled: true,
      server: MCP_CONFIG,
      tools: [
        'code-analyzer',
        'documentation-generator',
        'diagram-creator',
        'test-coverage-reporter'
      ]
    }
  };

  console.log(chalk.yellow('Starting sprint with MCP tools...'));
  const result = await conductor.startSprint(config);

  if (result.ok) {
    console.log(chalk.green('\n✅ Sprint completed with MCP tools!'));
    
    // Extract tool usage from metadata
    const toolUsage = result.value.metadata?.toolUsage as any;
    if (toolUsage) {
      console.log(chalk.cyan('\n📊 MCP Tool Usage Statistics:'));
      Object.entries(toolUsage).forEach(([tool, stats]: [string, any]) => {
        console.log(`  • ${tool}:`);
        console.log(`    - Calls: ${stats.calls}`);
        console.log(`    - Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
        console.log(`    - Avg Response Time: ${stats.avgResponseTime}ms`);
      });
    }
  } else {
    console.log(chalk.red('❌ Sprint failed:'), result.error);
  }
}

/**
 * Example 4: Custom MCP tool implementation
 */
async function customMCPToolExample() {
  console.log(chalk.blue.bold('\n🔧 Custom MCP Tool Example\n'));

  // Register a custom tool with the MCP server
  const client = new MCPClient(MCP_CONFIG);
  
  try {
    await client.connect();

    // Register custom tool
    const toolDefinition = {
      name: 'project-analyzer',
      description: 'Analyzes project structure and suggests improvements',
      parameters: {
        path: { type: 'string', required: true },
        depth: { type: 'number', default: 3 },
        includeTests: { type: 'boolean', default: true }
      },
      handler: async (params: any) => {
        // Tool implementation
        console.log(chalk.gray('🔍 Analyzing project:', params.path));
        
        // Simulate analysis
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        return {
          summary: {
            totalFiles: 142,
            totalLines: 8453,
            testCoverage: 0.78,
            complexityScore: 6.2
          },
          suggestions: [
            'Consider splitting large modules',
            'Add more unit tests for edge cases',
            'Update deprecated dependencies'
          ]
        };
      }
    };

    console.log(chalk.yellow('Registering custom MCP tool...'));
    await client.registerTool(toolDefinition);
    console.log(chalk.green('✅ Tool registered successfully'));

    // Use the tool in a sprint
    const result = await conductor.startSprint({
      task: "Analyze and improve project structure",
      agents: ['architect', 'reviewer'],
      mcpTools: {
        enabled: true,
        server: MCP_CONFIG,
        tools: ['project-analyzer']
      }
    });

    if (result.ok) {
      console.log(chalk.green('\n✅ Analysis completed!'));
      const analysis = result.value.metadata?.toolResults?.['project-analyzer'];
      if (analysis) {
        console.log(chalk.cyan('\n📊 Project Analysis Results:'));
        console.log(JSON.stringify(analysis, null, 2));
      }
    }

  } catch (error) {
    console.error(chalk.red('💥 Error:'), error);
  } finally {
    await client.disconnect();
  }
}

/**
 * Example 5: Batch operations via MCP
 */
async function batchOperationsExample() {
  console.log(chalk.blue.bold('\n📦 MCP Batch Operations Example\n'));

  const client = new MCPClient(MCP_CONFIG);

  try {
    await client.connect();

    // Prepare batch requests
    const batchRequests = [
      {
        id: 'frontend',
        task: "Build responsive React components",
        agents: ['developer', 'tester']
      },
      {
        id: 'backend',
        task: "Create RESTful API endpoints",
        agents: ['architect', 'developer']
      },
      {
        id: 'database',
        task: "Design and optimize database schema",
        agents: ['architect', 'developer']
      }
    ];

    console.log(chalk.yellow(`Submitting ${batchRequests.length} swarms in batch...`));
    
    const batchResult = await client.createBatchSwarms(batchRequests);

    if (batchResult.ok) {
      console.log(chalk.green(`\n✅ Batch submitted! ${batchResult.value.length} swarms created.`));
      
      // Monitor all swarms
      const statuses = await Promise.all(
        batchResult.value.map(swarm => 
          client.getSwarmStatus(swarm.id)
        )
      );

      console.log(chalk.cyan('\n📊 Batch Status Summary:'));
      statuses.forEach((status, index) => {
        if (status.ok) {
          const s = status.value;
          console.log(`  • ${batchRequests[index].id}: ${s.phase} (${s.confidence.toFixed(2)} confidence)`);
        }
      });
    }

  } catch (error) {
    console.error(chalk.red('💥 Batch operation error:'), error);
  } finally {
    await client.disconnect();
  }
}

// Main function to run examples
async function main() {
  console.log(chalk.magenta.bold('\n🎼 Swarm Conductor - MCP Integration Examples\n'));
  console.log(chalk.gray('Make sure the MCP server is running on port 8080\n'));

  const examples = [
    { name: 'Start Swarm via MCP', fn: startSwarmViaMCP },
    { name: 'Sprint with MCP Tools', fn: sprintWithMCPTools },
    { name: 'Custom MCP Tool', fn: customMCPToolExample },
    { name: 'Batch Operations', fn: batchOperationsExample }
  ];

  // Run selected example (change index to run different examples)
  const selectedExample = 0; // Change this to run different examples

  try {
    await examples[selectedExample].fn();
  } catch (error) {
    console.error(chalk.red.bold('\n💥 Example failed:'), error);
    process.exit(1);
  }
}

// Execute if run directly
if (import.meta.main) {
  main();
}