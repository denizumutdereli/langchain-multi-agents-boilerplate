import { RunnableSequence } from '@langchain/core/runnables';
import { BaseModule, ModuleMetadata } from '../core/base/module.base';
import { ChainError } from '../core/errors/base.error';
import { logger } from '../utils/logger';

export interface ChainMetadata extends ModuleMetadata {
  type: 'chain';
  inputType: string;
  outputType: string;
}

export interface ChainConfig {
  maxRetries?: number;
  timeout?: number;
  callbacks?: ChainCallbacks;
}

export interface ChainCallbacks {
  onStart?: (chainName: string) => void;
  onEnd?: (chainName: string, result: unknown) => void;
  onError?: (chainName: string, error: Error) => void;
}

export abstract class BaseChain<Input, Output> extends BaseModule {
  protected sequence!: RunnableSequence;
  protected config: ChainConfig;

  constructor(metadata: ChainMetadata, config: ChainConfig = {}) {
    super({ ...metadata, type: 'chain' });
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };
  }

  protected async initialize(): Promise<void> {
    try {
      this.sequence = await this.buildSequence();
      logger.debug(`Chain sequence built: ${this.metadata.name}`);
    } catch (error) {
      throw new ChainError(
        `Failed to build chain sequence: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.metadata.name,
        { phase: 'sequence_build' }
      );
    }
  }

  protected async cleanup(): Promise<void> {
    // Cleanup any resources
    this.sequence = undefined as any;
  }

  abstract buildSequence(): Promise<RunnableSequence>;

  async invoke(input: Input): Promise<Output> {
    if (!this.isInitialized) {
      await this.initializeModule();
    }

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < this.config.maxRetries!) {
      try {
        this.config.callbacks?.onStart?.(this.metadata.name);

        const result = await Promise.race([
          this.sequence.invoke(input),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Chain execution timeout')), this.config.timeout)
          )
        ]);

        this.config.callbacks?.onEnd?.(this.metadata.name, result);
        
        const duration = Date.now() - startTime;
        logger.debug(`Chain executed successfully: ${this.metadata.name}`, {
          duration,
          attempt: attempts + 1
        });

        return result as Output;
      } catch (error) {
        attempts++;
        const isLastAttempt = attempts === this.config.maxRetries;
        const message = error instanceof Error ? error.message : 'Unknown error';

        logger.warn(`Chain execution attempt ${attempts} failed: ${this.metadata.name}`, {
          error: message,
          willRetry: !isLastAttempt
        });

        this.config.callbacks?.onError?.(this.metadata.name, error as Error);

        if (isLastAttempt) {
          throw new ChainError(
            `Chain execution failed after ${attempts} attempts: ${message}`,
            this.metadata.name,
            {
              attempts,
              duration: Date.now() - startTime,
              lastError: message
            }
          );
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    // This should never be reached due to the throw above
    throw new Error('Unexpected chain execution state');
  }

  getConfig(): ChainConfig {
    return this.config;
  }

  updateConfig(config: Partial<ChainConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    logger.debug(`Chain config updated: ${this.metadata.name}`, { config });
  }
} 