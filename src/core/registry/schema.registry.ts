import { z } from 'zod';
import { logger } from '../../utils/logger';
import { ValidationError } from '../errors/error.types';

export interface SchemaMetadata {
  name: string;
  description: string;
  version: string;
  category: 'agent' | 'chain' | 'tool' | 'service' | 'model';
}

export class SchemaRegistry {
  private static instance: SchemaRegistry;
  private schemas: Map<string, z.ZodSchema> = new Map();
  private metadata: Map<string, SchemaMetadata> = new Map();

  private constructor() {}

  static getInstance(): SchemaRegistry {
    if (!SchemaRegistry.instance) {
      SchemaRegistry.instance = new SchemaRegistry();
    }
    return SchemaRegistry.instance;
  }

  register<T>(
    schema: z.ZodSchema<T>,
    metadata: SchemaMetadata
  ): void {
    if (this.schemas.has(metadata.name)) {
      throw new ValidationError(
        `Schema already registered`,
        metadata.name,
        { category: metadata.category }
      );
    }

    this.schemas.set(metadata.name, schema);
    this.metadata.set(metadata.name, metadata);

    logger.debug(`Registered schema: ${metadata.name}`, {
      category: metadata.category,
      version: metadata.version
    });
  }

  get<T>(name: string): z.ZodSchema<T> {
    const schema = this.schemas.get(name);
    if (!schema) {
      throw new ValidationError(
        `Schema not found`,
        name
      );
    }
    return schema as z.ZodSchema<T>;
  }

  validate<T>(name: string, data: unknown): T {
    const schema = this.get<T>(name);
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'Schema validation failed',
          name,
          {
            errors: error.errors,
            schema: this.metadata.get(name)
          }
        );
      }
      throw error;
    }
  }

  getMetadata(name: string): SchemaMetadata {
    const metadata = this.metadata.get(name);
    if (!metadata) {
      throw new ValidationError(
        `Schema metadata not found`,
        name
      );
    }
    return metadata;
  }

  listSchemas(): SchemaMetadata[] {
    return Array.from(this.metadata.values());
  }

  getByCategory(category: SchemaMetadata['category']): SchemaMetadata[] {
    return this.listSchemas().filter(meta => meta.category === category);
  }

  clear(): void {
    this.schemas.clear();
    this.metadata.clear();
    logger.debug('Cleared all registered schemas');
  }

  // Helper method to register common schemas
  registerCommonSchemas(): void {
    // Agent schemas
    this.register(
      z.object({
        success: z.boolean(),
        message: z.string(),
        data: z.any().optional(),
        error: z.string().optional(),
        reasoning: z.string().optional(),
        sources: z.array(z.string()).optional(),
        timestamp: z.string()
      }),
      {
        name: 'AgentResponse',
        description: 'Common response format for all agents',
        version: '1.0.0',
        category: 'agent'
      }
    );

    // Chain schemas
    this.register(
      z.object({
        query: z.string(),
        chatId: z.string(),
        history: z.array(z.any()),
        context: z.string().optional()
      }),
      {
        name: 'ChainInput',
        description: 'Common input format for all chains',
        version: '1.0.0',
        category: 'chain'
      }
    );

    // Tool schemas
    this.register(
      z.object({
        name: z.string(),
        description: z.string(),
        parameters: z.record(z.any())
      }),
      {
        name: 'ToolConfig',
        description: 'Configuration format for tools',
        version: '1.0.0',
        category: 'tool'
      }
    );

    logger.info('Registered common schemas');
  }
}

export const schemaRegistry = SchemaRegistry.getInstance(); 