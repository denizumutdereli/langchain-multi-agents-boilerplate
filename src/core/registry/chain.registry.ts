import { logger } from '../../utils/logger';
import { BaseChain, ChainMetadata } from '../base/chain.base';
import { ValidationError } from '../errors/base.error';

export class ChainRegistry {
  private static instance: ChainRegistry;
  private chains: Map<string, BaseChain<any, any>> = new Map();

  private constructor() {}

  static getInstance(): ChainRegistry {
    if (!ChainRegistry.instance) {
      ChainRegistry.instance = new ChainRegistry();
    }
    return ChainRegistry.instance;
  }

  register<Input, Output>(chain: BaseChain<Input, Output>): void {
    const metadata = chain.getMetadata();
    if (this.chains.has(metadata.name)) {
      throw new ValidationError(`Chain '${metadata.name}' is already registered`);
    }
    
    this.chains.set(metadata.name, chain);
    logger.debug(`Registered chain: ${metadata.name}`, {
      description: metadata.description,
      version: metadata.version
    });
  }

  get<Input, Output>(name: string): BaseChain<Input, Output> {
    const chain = this.chains.get(name);
    if (!chain) {
      throw new ValidationError(`Chain '${name}' not found`);
    }
    return chain as BaseChain<Input, Output>;
  }

  getMetadata(name: string): ChainMetadata {
    const chain = this.chains.get(name);
    if (!chain) {
      throw new ValidationError(`Chain '${name}' not found`);
    }
    return chain.getMetadata();
  }

  listChains(): ChainMetadata[] {
    return Array.from(this.chains.values()).map(chain => chain.getMetadata());
  }

  hasChain(name: string): boolean {
    return this.chains.has(name);
  }

  unregister(name: string): void {
    if (!this.chains.has(name)) {
      throw new ValidationError(`Chain '${name}' not found`);
    }
    this.chains.delete(name);
    logger.debug(`Unregistered chain: ${name}`);
  }

  clear(): void {
    this.chains.clear();
    logger.debug('Cleared all registered chains');
  }
}

export const chainRegistry = ChainRegistry.getInstance(); 