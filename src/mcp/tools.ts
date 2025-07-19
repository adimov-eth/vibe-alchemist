// MCP Tool Definitions for Swarm Conductor
export interface MCPTool {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, any>;
    required?: string[];
  };
}

export const tools: MCPTool[] = [
  {
    name: "swarm_conductor_init",
    description: "Initialize a new Swarm Conductor session for recursive task solving",
    parameters: {
      type: "object",
      properties: {
        task: {
          type: "string",
          description: "The task to solve recursively"
        },
        confidence_threshold: {
          type: "number",
          description: "Confidence threshold (0.0-1.0)",
          default: 0.8
        },
        max_sprints: {
          type: "number",
          description: "Maximum number of sprints",
          default: 10
        },
        parallel_swarms: {
          type: "number",
          description: "Number of parallel swarms per sprint",
          default: 3
        }
      },
      required: ["task"]
    }
  },
  {
    name: "swarm_conductor_status",
    description: "Get status of a Swarm Conductor session",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to check"
        },
        verbose: {
          type: "boolean",
          description: "Include detailed sprint information",
          default: false
        }
      },
      required: ["session_id"]
    }
  },
  {
    name: "swarm_conductor_sprint",
    description: "Execute next sprint in a session",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID"
        },
        objective: {
          type: "string",
          description: "Sprint objective (optional, will auto-generate if not provided)"
        }
      },
      required: ["session_id"]
    }
  },
  {
    name: "swarm_conductor_checkpoint",
    description: "Create a checkpoint of current session state",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID"
        },
        name: {
          type: "string",
          description: "Checkpoint name"
        },
        description: {
          type: "string",
          description: "Checkpoint description"
        }
      },
      required: ["session_id", "name"]
    }
  },
  {
    name: "swarm_conductor_restore",
    description: "Restore session from checkpoint",
    parameters: {
      type: "object",
      properties: {
        checkpoint_id: {
          type: "string",
          description: "Checkpoint ID to restore"
        }
      },
      required: ["checkpoint_id"]
    }
  },
  {
    name: "swarm_conductor_list",
    description: "List active sessions or checkpoints",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["sessions", "checkpoints"],
          description: "What to list"
        },
        session_id: {
          type: "string",
          description: "Session ID (required for listing checkpoints)"
        }
      },
      required: ["type"]
    }
  },
  {
    name: "swarm_conductor_browser_test",
    description: "Run browser test with current session state",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID"
        },
        test_type: {
          type: "string",
          enum: ["visual", "functional", "performance"],
          description: "Type of browser test",
          default: "visual"
        },
        url: {
          type: "string",
          description: "URL to test (optional, will use artifacts if not provided)"
        }
      },
      required: ["session_id"]
    }
  },
  {
    name: "swarm_conductor_cancel",
    description: "Cancel an active session",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID to cancel"
        }
      },
      required: ["session_id"]
    }
  },
  {
    name: "swarm_conductor_export",
    description: "Export session artifacts and results",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID"
        },
        format: {
          type: "string",
          enum: ["zip", "json", "markdown"],
          description: "Export format",
          default: "zip"
        },
        output_path: {
          type: "string",
          description: "Output path"
        }
      },
      required: ["session_id"]
    }
  },
  {
    name: "swarm_conductor_metrics",
    description: "Get performance metrics for a session",
    parameters: {
      type: "object",
      properties: {
        session_id: {
          type: "string",
          description: "Session ID"
        },
        include_resources: {
          type: "boolean",
          description: "Include resource usage metrics",
          default: true
        }
      },
      required: ["session_id"]
    }
  }
];