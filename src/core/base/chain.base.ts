import { BaseCallbackConfig, CallbackManager, Callbacks, Serialized } from '@langchain/core/callbacks';
import { RunnableSequence, type RunnableConfig } from '@langchain/core/runnables';
import { logger } from '../../utils/logger';
import { ChainError } from '../errors/base.error';

export interface ChainMetadata {
  name: string;
  description: string;
  version: string;
}

export interface ChainConfig extends BaseCallbackConfig {
  maxRetries?: number;
  timeout?: number;
}

export abstract class BaseChain<Input, Output> {
  protected sequence!: RunnableSequence;
  protected metadata: ChainMetadata;
  protected config: ChainConfig;

  constructor(metadata: ChainMetadata, config: ChainConfig = {}) {
    this.metadata = metadata;
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config
    };
  }

  protected initialize(): void {
    try {
      this.sequence = this.buildSequence();
      logger.debug(`Chain '${this.metadata.name}' initialized successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error during initialization';
      logger.error(`Failed to initialize chain '${this.metadata.name}':`, error);
      throw new ChainError(message, this.metadata.name, { phase: 'initialization' });
    }
  }

  abstract buildSequence(): RunnableSequence;

  async invoke(input: Input, config?: RunnableConfig): Promise<Output> {
    if (!this.sequence) {
      this.initialize();
    }

    const startTime = Date.now();
    let attempts = 0;

    while (attempts < (this.config.maxRetries ?? 3)) {
      try {
        const callbacks = this.createCallbackManager(config?.callbacks);
        
        const result = await Promise.race([
          this.sequence.invoke(input, {
            ...config,
            callbacks
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Chain execution timeout')), this.config.timeout)
          )
        ]);

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

        await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
      }
    }

    throw new Error('Unexpected chain execution state');
  }

  private createCallbackManager(callbacks?: Callbacks): CallbackManager {
    const manager = new CallbackManager();
    
    // Add our custom handlers
    manager.addHandler({
      handleChainStart: async (chain: Serialized) => {
        logger.debug(`Chain step started: ${chain.id?.join('') || 'unknown'}`);
      },
      handleChainEnd: async (chain: Serialized, output: unknown) => {
        logger.debug(`Chain step completed: ${chain.id?.join('') || 'unknown'}`);
      },
      handleChainError: async (chain: Serialized, error: Error) => {
        logger.error(`Chain step failed: ${chain.id?.join('') || 'unknown'}`, error);
      }
    });

    // Add user-provided callbacks if any
    if (callbacks) {
      if (Array.isArray(callbacks)) {
        callbacks.forEach(handler => manager.addHandler(handler));
      } else if (callbacks instanceof CallbackManager) {
        callbacks.handlers.forEach(handler => manager.addHandler(handler));
      }
    }

    return manager;
  }

  getMetadata(): ChainMetadata {
    return this.metadata;
  }

  updateConfig(config: Partial<ChainConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    logger.debug(`Chain config updated: ${this.metadata.name}`, { config });
  }
} 