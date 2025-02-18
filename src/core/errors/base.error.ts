export class FootballAnalysisError extends Error {
  constructor(
    message: string,
    public readonly code: string = 'UNKNOWN_ERROR',
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'FootballAnalysisError';
  }
}

export class ChainError extends FootballAnalysisError {
  constructor(
    message: string,
    chainName: string,
    details?: Record<string, any>
  ) {
    super(
      `Chain '${chainName}' failed: ${message}`,
      'CHAIN_ERROR',
      details
    );
    this.name = 'ChainError';
  }
}

export class AgentError extends FootballAnalysisError {
  constructor(
    message: string,
    agentName: string,
    details?: Record<string, any>
  ) {
    super(
      `Agent '${agentName}' failed: ${message}`,
      'AGENT_ERROR',
      details
    );
    this.name = 'AgentError';
  }
}

export class ValidationError extends FootballAnalysisError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(
      `Validation failed: ${message}`,
      'VALIDATION_ERROR',
      details
    );
    this.name = 'ValidationError';
  }
}

export class SecurityError extends FootballAnalysisError {
  constructor(
    message: string,
    details?: Record<string, any>
  ) {
    super(
      `Security check failed: ${message}`,
      'SECURITY_ERROR',
      details
    );
    this.name = 'SecurityError';
  }
}

export class ToolError extends FootballAnalysisError {
  constructor(
    message: string,
    toolName: string,
    details?: Record<string, any>
  ) {
    super(
      `Tool '${toolName}' failed: ${message}`,
      'TOOL_ERROR',
      details
    );
    this.name = 'ToolError';
  }
} 