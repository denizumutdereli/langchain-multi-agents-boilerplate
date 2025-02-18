import { BaseMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { EnhancementAgentImpl } from '../agents/internal/enhancement.agent';
import { ChainError } from '../core/errors/error.types';
import { schemaRegistry } from '../core/registry/schema.registry';
import { logger } from '../utils/logger';
import { BaseChain } from './base.chain';

const EnhancementInputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  relevantDocs: z.array(z.any()),
  context: z.string()
});

const EnhancementOutputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  relevantDocs: z.array(z.any()),
  context: z.string(),
  enhancedQuery: z.string(),
  reasoning: z.string(),
  metadata: z.object({
    originalQuery: z.string(),
    enhancementType: z.enum(['clarification', 'expansion', 'correction']),
    confidence: z.number(),
    contextUsed: z.boolean()
  })
});

export type EnhancementChainInput = z.infer<typeof EnhancementInputSchema>;
export type EnhancementChainOutput = z.infer<typeof EnhancementOutputSchema>;

export class EnhancementChain extends BaseChain<EnhancementChainInput, EnhancementChainOutput> {
  private enhancementAgent: EnhancementAgentImpl;

  constructor() {
    super({
      name: 'query_enhancement',
      description: 'Enhances queries using context and conversation history',
      version: '1.0.0',
      type: 'chain',
      inputType: 'EnhancementChainInput',
      outputType: 'EnhancementChainOutput'
    });

    // Register schemas
    schemaRegistry.register(EnhancementInputSchema, {
      name: 'EnhancementChainInput',
      description: 'Input format for query enhancement chain',
      version: '1.0.0',
      category: 'chain'
    });

    schemaRegistry.register(EnhancementOutputSchema, {
      name: 'EnhancementChainOutput',
      description: 'Output format for query enhancement chain',
      version: '1.0.0',
      category: 'chain'
    });

    this.enhancementAgent = new EnhancementAgentImpl();
  }

  protected async buildSequence(): Promise<RunnableSequence> {
    return RunnableSequence.from([
      {
        name: 'query_enhancement',
        invoke: async (input: EnhancementChainInput): Promise<EnhancementChainOutput> => {
          try {
            // Validate input
            const validatedInput = schemaRegistry.validate<EnhancementChainInput>(
              'EnhancementChainInput',
              input
            );

            const result = await this.enhancementAgent.process(
              validatedInput.query,
              validatedInput.chatId,
              validatedInput.history as BaseMessage[],
              validatedInput.context
            );

            if (!result.success) {
              throw new ChainError(
                result.message || 'Failed to enhance query',
                this.metadata.name,
                { 
                  query: validatedInput.query,
                  error: result.error
                }
              );
            }

            const output: EnhancementChainOutput = {
              ...validatedInput,
              enhancedQuery: result.data.enhancedQuery,
              reasoning: result.reasoning || '',
              metadata: {
                originalQuery: validatedInput.query,
                enhancementType: this.determineEnhancementType(
                  validatedInput.query,
                  result.data.enhancedQuery
                ),
                confidence: result.data.confidence || 0.8,
                contextUsed: !!validatedInput.context
              }
            };

            // Validate output
            return schemaRegistry.validate<EnhancementChainOutput>(
              'EnhancementChainOutput',
              output
            );
          } catch (error) {
            logger.error('Query enhancement failed:', error);
            throw error;
          }
        }
      }
    ]);
  }

  private determineEnhancementType(
    originalQuery: string,
    enhancedQuery: string
  ): EnhancementChainOutput['metadata']['enhancementType'] {
    const originalLength = originalQuery.length;
    const enhancedLength = enhancedQuery.length;
    
    if (enhancedLength < originalLength) {
      return 'correction';
    }
    
    if (enhancedLength > originalLength * 1.5) {
      return 'expansion';
    }
    
    return 'clarification';
  }
} 