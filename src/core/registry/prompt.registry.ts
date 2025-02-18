import { ChatPromptTemplate } from '@langchain/core/prompts';
import { logger } from '../../utils/logger';
import { ValidationError } from '../errors/base.error';

export interface PromptMetadata {
  name: string;
  description: string;
  version: string;
  category: 'agent' | 'chain' | 'tool';
}

export class PromptRegistry {
  private static instance: PromptRegistry;
  private prompts: Map<string, ChatPromptTemplate> = new Map();
  private metadata: Map<string, PromptMetadata> = new Map();

  private constructor() {}

  static getInstance(): PromptRegistry {
    if (!PromptRegistry.instance) {
      PromptRegistry.instance = new PromptRegistry();
    }
    return PromptRegistry.instance;
  }

  register(
    prompt: ChatPromptTemplate,
    metadata: PromptMetadata
  ): void {
    if (this.prompts.has(metadata.name)) {
      throw new ValidationError(`Prompt '${metadata.name}' is already registered`);
    }
    
    this.prompts.set(metadata.name, prompt);
    this.metadata.set(metadata.name, metadata);
    
    logger.debug(`Registered prompt: ${metadata.name}`, {
      category: metadata.category,
      version: metadata.version
    });
  }

  get(name: string): ChatPromptTemplate {
    const prompt = this.prompts.get(name);
    if (!prompt) {
      throw new ValidationError(`Prompt '${name}' not found`);
    }
    return prompt;
  }

  getMetadata(name: string): PromptMetadata {
    const metadata = this.metadata.get(name);
    if (!metadata) {
      throw new ValidationError(`Prompt metadata for '${name}' not found`);
    }
    return metadata;
  }

  listPrompts(): PromptMetadata[] {
    return Array.from(this.metadata.values());
  }

  getByCategory(category: PromptMetadata['category']): PromptMetadata[] {
    return this.listPrompts().filter(meta => meta.category === category);
  }

  clear(): void {
    this.prompts.clear();
    this.metadata.clear();
    logger.debug('Cleared all registered prompts');
  }
}

export const promptRegistry = PromptRegistry.getInstance(); 