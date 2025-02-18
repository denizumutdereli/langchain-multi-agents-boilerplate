import { FootballAnalysisError } from './base.error';

export class InitializationError extends FootballAnalysisError {
  constructor(
    message: string,
    moduleName: string,
    details?: Record<string, any>
  ) {
    super(
      `Initialization failed for ${moduleName}: ${message}`,
      'INITIALIZATION_ERROR',
      details
    );
    this.name = 'InitializationError';
  }
}

export class TimeoutError extends FootballAnalysisError {
  constructor(
    message: string,
    operationName: string,
    timeout: number,
    details?: Record<string, any>
  ) {
    super(
      `Operation '${operationName}' timed out after ${timeout}ms: ${message}`,
      'TIMEOUT_ERROR',
      { ...details, timeout }
    );
    this.name = 'TimeoutError';
  }
}

export class ConfigurationError extends FootballAnalysisError {
  constructor(
    message: string,
    configKey: string,
    details?: Record<string, any>
  ) {
    super(
      `Configuration error for '${configKey}': ${message}`,
      'CONFIG_ERROR',
      details
    );
    this.name = 'ConfigurationError';
  }
}

export class ModelError extends FootballAnalysisError {
  constructor(
    message: string,
    modelName: string,
    details?: Record<string, any>
  ) {
    super(
      `Model '${modelName}' error: ${message}`,
      'MODEL_ERROR',
      details
    );
    this.name = 'ModelError';
  }
}

export class CacheError extends FootballAnalysisError {
  constructor(
    message: string,
    operation: string,
    details?: Record<string, any>
  ) {
    super(
      `Cache operation '${operation}' failed: ${message}`,
      'CACHE_ERROR',
      details
    );
    this.name = 'CacheError';
  }
}

export class PromptError extends FootballAnalysisError {
  constructor(
    message: string,
    promptName: string,
    details?: Record<string, any>
  ) {
    super(
      `Prompt '${promptName}' error: ${message}`,
      'PROMPT_ERROR',
      details
    );
    this.name = 'PromptError';
  }
}

export class AgentError extends FootballAnalysisError {
  constructor(
    message: string,
    agentName: string,
    details?: Record<string, any>
  ) {
    super(
      `Agent '${agentName}' error: ${message}`,
      'AGENT_ERROR',
      details
    );
    this.name = 'AgentError';
  }
}

export class ChainExecutionError extends FootballAnalysisError {
  constructor(
    message: string,
    chainName: string,
    details?: Record<string, any>
  ) {
    super(
      `Chain '${chainName}' execution failed: ${message}`,
      'CHAIN_EXECUTION_ERROR',
      details
    );
    this.name = 'ChainExecutionError';
  }
}

export class ToolError extends FootballAnalysisError {
  constructor(
    message: string,
    toolName: string,
    details?: Record<string, any>
  ) {
    super(
      `Tool '${toolName}' error: ${message}`,
      'TOOL_ERROR',
      details
    );
    this.name = 'ToolError';
  }
}

export class ValidationError extends FootballAnalysisError {
  constructor(
    message: string,
    context: string,
    details?: Record<string, any>
  ) {
    super(
      `Validation failed in ${context}: ${message}`,
      'VALIDATION_ERROR',
      details
    );
    this.name = 'ValidationError';
  }
}

export class ServiceError extends FootballAnalysisError {
  constructor(
    message: string,
    serviceName: string,
    details?: Record<string, any>
  ) {
    super(
      `Service '${serviceName}' error: ${message}`,
      'SERVICE_ERROR',
      details
    );
    this.name = 'ServiceError';
  }
} 