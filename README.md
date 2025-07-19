# Swarm Conductor 🎼

> Meta-orchestrator CLI for claude-flow swarms - maximize concurrency and effectiveness

[![npm version](https://img.shields.io/npm/v/@swarm/conductor.svg)](https://www.npmjs.com/package/@swarm/conductor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?style=flat&logo=bun&logoColor=white)](https://bun.sh)

## 🚀 Overview

Swarm Conductor is a powerful meta-orchestration tool that manages multiple AI agent swarms to maximize parallel execution and task effectiveness. Built with functional programming principles and immutability at its core, it provides a robust framework for complex multi-agent workflows.

### Key Features

- **🔄 Recursive Sprint Management** - Automatically break down complex tasks into manageable sprints
- **⚡ Maximum Concurrency** - Orchestrate multiple swarms in parallel for optimal performance
- **💾 State Checkpointing** - Never lose progress with automatic state persistence and recovery
- **🛡️ MCP Server Integration** - Seamless integration with Model Context Protocol
- **🧪 Browser Testing Framework** - Built-in support for automated browser testing
- **📊 Confidence Tracking** - Monitor agent confidence levels and adjust strategies dynamically
- **🎯 SPARC Methodology** - Structured approach to Planning, Executing, Testing, Refactoring, and Completing

## 📦 Installation

```bash
# Using npm
npm install -g @swarm/conductor

# Using bun
bun add -g @swarm/conductor

# Using npx (no installation)
npx @swarm/conductor --help
```

## 🎯 Quick Start

### Initialize a New Swarm Project

```bash
swarm-conductor init my-project
cd my-project
```

### Start a New Sprint

```bash
swarm-conductor start "Build a REST API with authentication"
```

### Resume from Checkpoint

```bash
swarm-conductor resume <checkpoint-id>
```

### Run as MCP Server

```bash
swarm-conductor mcp-server --port 8080
```

## 📖 Usage Examples

### Basic Sprint Execution

```typescript
import { conductor } from '@swarm/conductor';

const result = await conductor.startSprint({
  task: "Build a user authentication system",
  agents: ['architect', 'developer', 'tester'],
  confidence_threshold: 0.8
});

if (result.ok) {
  console.log('Sprint completed successfully:', result.value);
} else {
  console.error('Sprint failed:', result.error);
}
```

### Advanced Multi-Swarm Orchestration

```typescript
import { conductor, SwarmConfig } from '@swarm/conductor';

const config: SwarmConfig = {
  parallel_swarms: 3,
  checkpoint_interval: 300, // 5 minutes
  confidence_threshold: 0.85,
  phases: ['planning', 'executing', 'testing', 'refactoring', 'completing']
};

const orchestrator = conductor.createOrchestrator(config);

// Start multiple swarms in parallel
const results = await orchestrator.startParallelSwarms([
  { task: "Frontend development", agents: ['ui-designer', 'frontend-dev'] },
  { task: "Backend API", agents: ['architect', 'backend-dev'] },
  { task: "Database design", agents: ['dba', 'data-architect'] }
]);
```

### State Recovery

```typescript
// Automatically recover from the last checkpoint
const resumed = await conductor.resumeFromCheckpoint('checkpoint-xyz');

if (resumed.ok) {
  console.log('Resumed from:', resumed.value.checkpoint_id);
  console.log('Progress:', resumed.value.progress);
}
```

## 🏗️ Architecture

Swarm Conductor follows a functional programming paradigm with immutable state management:

```
┌─────────────────────────────────────────┐
│         Swarm Conductor CLI             │
├─────────────────────────────────────────┤
│   Orchestration Layer (Functional)      │
├─────────────────────────────────────────┤
│   State Management (Immutable)          │
├─────────────────────────────────────────┤
│   Agent Swarms │ MCP Server │ Browser   │
└─────────────────────────────────────────┘
```

### Core Components

- **Sprint Manager** - Handles recursive sprint execution and task breakdown
- **Swarm Orchestrator** - Manages multiple agent swarms in parallel
- **State Checkpoint System** - Persists and recovers state automatically
- **Confidence Analyzer** - Monitors and adjusts based on agent confidence
- **MCP Integration** - Provides Model Context Protocol server capabilities

## 🔧 Configuration

Create a `swarm.config.json` in your project root:

```json
{
  "confidence_threshold": 0.8,
  "max_parallel_swarms": 5,
  "checkpoint_interval": 300,
  "mcp_server": {
    "enabled": true,
    "port": 8080
  },
  "phases": ["planning", "executing", "testing", "refactoring", "completing"],
  "agents": {
    "default": ["architect", "developer", "tester", "reviewer"],
    "specialized": {
      "frontend": ["ui-designer", "frontend-dev", "ux-tester"],
      "backend": ["architect", "backend-dev", "dba", "api-tester"]
    }
  }
}
```

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/swarm-conductor/swarm-conductor
cd swarm-conductor

# Install dependencies
bun install

# Run tests
bun test

# Build the project
bun run build

# Run in development mode
bun run dev
```

## 📚 Documentation

- [Architecture Guide](./docs/architecture.md)
- [API Reference](./docs/api.md)
- [Examples](./examples/)
- [Contributing Guide](./CONTRIBUTING.md)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgments

Built with ❤️ using:
- [Bun](https://bun.sh) - Fast all-in-one JavaScript runtime
- [Claude Flow](https://github.com/ruvnet/claude-flow) - AI agent coordination framework
- [Commander.js](https://github.com/tj/commander.js) - Node.js command-line interfaces
- [Zod](https://github.com/colinhacks/zod) - TypeScript-first schema validation

---

Made with 🎼 by the Swarm Conductor Team
