# Updated Comprehensive Specification for "Swarm Conductor" Tool

This specification refines the previous version based on analysis feedback: Remove all TaskMaster references; add recursion depth/resource management; define confidence heuristics; address state persistence (transactions, migrations, cleanup); incorporate resource monitoring, error recovery, checkpointing, claude-flow memory integration; refine browser strategy (static first, browser for UI, headless timeouts); add MCP tool definition; handle edge cases; adopt Result type; commit to Bun test runner (remove vitest); add telemetry. Verified against rules: Functional/declarative (pure funcs, RO-RO); modular (<500 lines/file, <50 lines/func); descriptive naming; immutability (readonly/as const); no unnecessary code (leverage Bun natives). GitHub Issue #784 verification confirms integration risks, justifying removal.

## 1. Overview and Purpose

- **Tool Name**: Swarm Conductor
- **Version**: 1.0.0-alpha
- **Description**: A higher-order meta-assistant CLI tool orchestrating claude-flow swarms for recursive/parallel development sprints. Acts as singular human-swarm interface, enforcing SPARC phases, YOLO autonomy with configurable confidence thresholds, MCP-wrapped browser loops, refactoring/testing, and scratch/existing project handling. Wrapped as Bun-powered CLI with MCP server mode for Claude Desktop integration. Relies solely on claude-flow's SPARC for planning.
- **Key Features** (Immutable Set):
  - Recursive sprint cycles via tree-structured state with depth limits.
  - Parallel sub-swarms using Bun's async primitives.
  - YOLO default with confidence param (threshold 0.8 default; low triggers human gates).
  - Browser feedback via MCP tool (static analysis first; browser for UI/UX only, headless with timeouts).
  - Refactoring with TDD before merges.
  - Auto-detect/init for scratch/existing via `bun:sqlite` queries.
  - MCP server for AI control (e.g., Claude Desktop invocations).
  - Checkpointing, resource monitoring, error recovery, telemetry.
- **Target Users**: Web devs with claude-flow; extensible.
- **Non-Goals**: External tool integrations. No GUI beyond CLI/MCP.

## 2. Architecture

Adopts functional/declarative paradigm: Composable pure functions, immutable data flows, RO-RO patterns. Modular: Small files (<500 lines), functions (<50 lines) with single purposes. Immutability enforced via `readonly`/`as const`. Edge cases handled: Zero agents (manual fallback), network partitions (MCP retries), state corruption (SQLite recovery), circular dependencies (depth checks), memory leaks (auto-close browsers).

### High-Level Components (Declarative Composition)

- **CLI Interface Layer**: Parses args, dispatches via pure functions. Composed from commander (minimal wrapper).
- **Conductor Core**: State machine for sprints; pure functions transform immutable state (e.g., `reduceSprintState(state, action)`). Sub-modules: planner, executor, monitor, evaluator—each RO-RO.
- **Integration Layer**: Pure wrappers for claude-flow (Bun's `Bun.spawn`), MCP server (Bun's HTTP server), browser (Bun-wrapped puppeteer-core as MCP tool).
- **State Management**: Immutable objects; persist via dedicated StateRepository module using `bun:sqlite` (transactions for parallel writes, schema migrations via versioned queries, cleanup for old sessions via timed jobs).
- **MCP Wrapper**: Bun server exposing declarative endpoints (e.g., `handleMcpRequest(req)` returns response object).
- **Event Bus**: Bun's `EventEmitter` with immutable event payloads (key types: SPRINT_STARTED, PHASE_COMPLETED, CONFIDENCE_THRESHOLD_REACHED).
- **Recursion/Parallelism Model**: Immutable tree (`readonly Node[]`); `map` for recursion (with maxDepth check), Bun's `Promise.all` for parallelism.
- **Error Handling & Logging**: Pure funcs return `Result<T, E>`; winston for declarative logs with telemetry (e.g., outcomes logged for learning).
- **Data Flow** (Functional): Input → Parse → Transform State → Execute/Parallel → Eval Confidence → Output/Gate.

### Scalability & Performance

- Leverage Bun's speed: <1s startup; handle 10 parallels via native async.
- Confidence: RO-RO config param; computed via defined heuristics.

### Security Considerations

- MCP: Token-based, immutable auth objects.
- Browser: Headless, no state persistence, strict timeouts.
- Sandbox: Bun flags for isolation.

## 3. Dependencies

Minimized per "best code is no code": Leverage Bun natives. Install via `bun add`. Edge cases: Test low confidence (gates), parallel failures (retries). Improvements: Add caching for evals; edge: Zero agents (manual mode).

### Core Dependencies (production, <10 total)

- **commander**: ^12.0.0 – CLI parsing (pure command builders).
- **puppeteer-core**: ^23.0.0 – Browser tool (MCP-wrapped).
- **xstate**: ^5.0.0 – Declarative state machines (immutable states).
- **winston**: ^3.13.0 – Logging (configurable transports).
- **json5**: ^2.2.3 – Flexible parsing (immutable outputs).

### Dev Dependencies

- **typescript**: ^5.5.0 – Types (strict, readonly emphasis).
- **@types/bun**: ^1.0.0 – Bun typings (2025 native).
- **lint-staged**: ^15.0.0 + husky – Pre-commit (enforce immutability).
- **prettier**: ^3.3.0 + eslint: ^9.0.0 – Style (declarative configs).

### Built-In (Bun Natives, No Deps)

- `bun:sqlite` – State queries (immutable result objects).
- Bun's HTTP – MCP server.
- Bun's spawn – claude-flow execution.
- Bun's Promise – Parallelism.
- Bun's test runner – Testing (replace vitest; native assertions).

### Peer Dependencies

- **claude-flow**: @alpha – Wrapped exec.

### Build/Deployment

- **tsconfig.json** (as const): { "target": "ES2022", "strict": true, "noImplicitAny": true }
- **Build**: `bun build src/index.ts --outdir dist --target bun` (Bun native bundler).
- **Run**: `bun run dist/index.js` (Bun as runtime/server).
- **Test**: `bun test` (native runner).
- **Publish**: npm package with `bin` field; use `bun install` for deps.

## 4. Interfaces and APIs

### CLI Interface (Functional Parsers)

- Commands (via commander, pure):
  - `init(dir: string, options: InitOptions)`: Returns Result<SprintState, Error>.
  - `start(goal: string, options: StartOptions)`: RO-RO, defaults {confidenceThreshold: 0.8}.
  - `resume(sessionId: string)`: Immutable state load.
  - `mcp-server(port = 3000)`: Starts Bun server.
- Options Type: `readonly StartOptions = { web?: boolean, recursive?: boolean, confidenceThreshold: number } as const`

### MCP Endpoints (Declarative Handlers)

- Bun HTTP server: Pure request handlers return immutable responses.
- Examples (RO-RO):
  - `handleStartSprint(req: {goal: string, confidence: number})`: Returns Result<{status: string, state: SprintState}, Error>.
  - `handleBrowserTest(req: {url: string, script: string})`: Returns Result<{result: string, logs: readonly string[]}, Error>.
- Browser Tool: `const browserTestTool = { name: "browser_test", description: "Validate web output in headless browser", inputSchema: { type: "object", properties: { url: { type: "string" }, assertions: { type: "array", items: { type: "string" } }, timeout: { type: "number", default: 5000 } } } } as const;`

### Internal Interfaces (Immutable Types)

- `type SprintState = readonly { phase: 'planning' | 'executing' | ...; tree: readonly Node[]; confidence: number }`
- `type Node = readonly { id: string; goal: string; children: readonly Node[]; status: 'pending' | 'done' }`
- `type Config = readonly { confidenceThreshold: number = 0.8; webEnabled: boolean = false; recursion: RecursionConfig; resources: ResourceLimits; retry: RetryStrategy; } as const`
- `type RecursionConfig = readonly { maxDepth: number; maxAgentsPerLevel: number; memoryThresholdMB: number; } as const`
- `type ResourceLimits = readonly { maxConcurrentAgents: number; maxMemoryMB: number; maxExecutionTimeMs: number; cpuThresholdPercent: number; } as const`
- `type RetryStrategy = readonly { maxRetries: number; backoffMs: readonly number[]; fallbackMode: 'manual' | 'reduced-agents'; } as const`
- `type Checkpoint = readonly { sprintId: string; timestamp: number; state: SprintState; artifacts: readonly string[]; } as const`
- `type ConfidenceFactors = readonly { testPassRate: number; codeComplexity: number; agentConsensus: number; previousSuccess: number; } as const`
- `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`
- Functions: e.g., `reduceState(state: SprintState, action: Action): Result<SprintState, Error>` (pure, immutable); `calculateConfidence(factors: ConfidenceFactors): number` (weighted average, e.g., (sum factors)/4).

### StateRepository Module (Pure API)

- `saveState(state: SprintState): Promise<Result<void, Error>>` – Transactional write to `bun:sqlite`, integrate claude-flow memory (e.g., exec `./claude-flow memory store "sprint-${id}" "${JSON.stringify(state)}"`).
- `loadState(sessionId: string): Promise<Result<SprintState, Error>>` – Query `bun:sqlite`, hydrate immutable object.
- Handles migrations (versioned schemas), cleanup (delete old via timestamp).

## 5. Non-Functional Requirements

- **Performance**: Bun-optimized; test edge: High recursion (depth limit errors), low confidence (gates).
- **Compatibility**: Bun 1.2+; claude-flow alpha.
- **Testing**: 90% coverage (Bun test runner: pure func tests, integration mocks).
- **Documentation**: README.md with examples; JSDoc for funcs.
- **Extensibility**: Composers for custom phases (e.g., `composePhase(planner, executor)`).
- **Telemetry**: Log outcomes (e.g., confidence scores) for post-analysis.
- **Browser Strategy**: Static analysis first (e.g., lint); browser for UI/UX only, headless with timeouts.

## 6. Risks and Mitigations

- **Bun Instability**: Fallback to Node exec if Bun fails (conditional import).
- **MCP**: Test with mocks; edge: Network failures → retries.
- **Immutability Violations**: ESLint rules to enforce.
- **Edge Cases**: Zero agents (manual fallback), state corruption (SQLite recovery funcs), circular deps (depth checks), memory leaks (auto-close in finally blocks).
