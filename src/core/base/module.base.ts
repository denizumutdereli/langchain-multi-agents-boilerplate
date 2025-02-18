import { logger } from '../../utils/logger';
import { ChainError } from '../errors/base.error';

export interface ModuleMetadata {
  name: string;
  description: string;
  version: string;
  type: 'agent' | 'chain' | 'tool' | 'service';
}

export abstract class BaseModule {
  protected metadata: ModuleMetadata;
  protected isInitialized = false;

  constructor(metadata: ModuleMetadata) {
    this.metadata = metadata;
  }

  protected async initializeModule(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      logger.debug(`Initializing module: ${this.metadata.name}`);
      await this.initialize();
      this.isInitialized = true;
      logger.debug(`Module initialized: ${this.metadata.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to initialize module ${this.metadata.name}:`, error);
      throw new ChainError(message, this.metadata.name, {
        phase: 'initialization',
        type: this.metadata.type
      });
    }
  }

  protected abstract initialize(): Promise<void>;

  async shutdown(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      logger.debug(`Shutting down module: ${this.metadata.name}`);
      await this.cleanup();
      this.isInitialized = false;
      logger.debug(`Module shut down: ${this.metadata.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Failed to shut down module ${this.metadata.name}:`, error);
      throw new ChainError(message, this.metadata.name, {
        phase: 'shutdown',
        type: this.metadata.type
      });
    }
  }

  protected abstract cleanup(): Promise<void>;

  getMetadata(): ModuleMetadata {
    return this.metadata;
  }

  isReady(): boolean {
    return this.isInitialized;
  }
} 