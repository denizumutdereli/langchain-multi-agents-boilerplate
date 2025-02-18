import { Document } from '@langchain/core/documents';
import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { ChainError } from '../core/errors/error.types';
import { schemaRegistry } from '../core/registry/schema.registry';
import { ragService } from '../services/rag.service';
import { logger } from '../utils/logger';
import { BaseChain } from './base.chain';

const ContextInputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  securityValidated: z.boolean(),
  context: z.string().optional()
});

const ContextOutputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  securityValidated: z.boolean(),
  context: z.string(),
  relevantDocs: z.array(z.any()),
  metadata: z.object({
    sourceCount: z.number(),
    confidence: z.number(),
    retrievalTime: z.number()
  })
});

export type ContextChainInput = z.infer<typeof ContextInputSchema>;
export type ContextChainOutput = z.infer<typeof ContextOutputSchema>;

export class ContextChain extends BaseChain<ContextChainInput, ContextChainOutput> {
  constructor() {
    super({
      name: 'context_retrieval',
      description: 'Retrieves and processes relevant context for queries',
      version: '1.0.0',
      type: 'chain',
      inputType: 'ContextChainInput',
      outputType: 'ContextChainOutput'
    });

    // Register schemas
    schemaRegistry.register(ContextInputSchema, {
      name: 'ContextChainInput',
      description: 'Input format for context retrieval chain',
      version: '1.0.0',
      category: 'chain'
    });

    schemaRegistry.register(ContextOutputSchema, {
      name: 'ContextChainOutput',
      description: 'Output format for context retrieval chain',
      version: '1.0.0',
      category: 'chain'
    });
  }

  protected async buildSequence(): Promise<RunnableSequence> {
    return RunnableSequence.from([
      {
        name: 'context_retrieval',
        invoke: async (input: ContextChainInput): Promise<ContextChainOutput> => {
          try {
            // Validate input
            const validatedInput = schemaRegistry.validate<ContextChainInput>(
              'ContextChainInput',
              input
            );

            const startTime = Date.now();

            // Retrieve relevant documents
            const docs = await ragService.findRelevantContext(
              validatedInput.query,
              3,  // maxResults
              0.7  // similarityThreshold
            );

            // Process and combine context
            const context = this.processDocuments(docs);
            const duration = Date.now() - startTime;

            const output: ContextChainOutput = {
              ...validatedInput,
              context,
              relevantDocs: docs,
              metadata: {
                sourceCount: docs.length,
                confidence: this.calculateConfidence(docs),
                retrievalTime: duration
              }
            };

            // Validate output
            return schemaRegistry.validate<ContextChainOutput>(
              'ContextChainOutput',
              output
            );
          } catch (error) {
            logger.error('Context retrieval failed:', error);
            throw new ChainError(
              error instanceof Error ? error.message : 'Context retrieval failed',
              this.metadata.name,
              { phase: 'context_retrieval' }
            );
          }
        }
      }
    ]);
  }

  private processDocuments(docs: Document[]): string {
    return docs
      .map(doc => {
        const metadata = doc.metadata || {};
        return `[${metadata.type || 'unknown'}] ${doc.pageContent}`;
      })
      .join('\n\n');
  }

  private calculateConfidence(docs: Document[]): number {
    if (docs.length === 0) return 0;
    
    // Simple confidence calculation based on number of sources
    // and their similarity scores (if available)
    const baseConfidence = Math.min(docs.length / 3, 1); // Max confidence with 3 sources
    
    // If we have similarity scores, use them to adjust confidence
    const similarityScores = docs
      .map(doc => doc.metadata?.similarity as number)
      .filter(score => typeof score === 'number');

    if (similarityScores.length > 0) {
      const avgSimilarity = similarityScores.reduce((a, b) => a + b, 0) / similarityScores.length;
      return (baseConfidence + avgSimilarity) / 2;
    }

    return baseConfidence;
  }
} 