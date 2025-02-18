import { Document } from '@langchain/core/documents';
import { BaseMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseChain } from '../../core/base/chain.base';
import { ChainError } from '../../core/errors/base.error';
import { EnhancementAgentImpl } from '../internal/enhancement.agent';

export interface EnhancementChainInput {
  query: string;
  chatId: string;
  history: BaseMessage[];
  relevantDocs: Document[];
  context: string;
}

export interface EnhancementChainOutput extends EnhancementChainInput {
  enhancedQuery: string;
  reasoning: string;
}

export class EnhancementChain extends BaseChain<EnhancementChainInput, EnhancementChainOutput> {
  private enhancementAgent: EnhancementAgentImpl;

  constructor() {
    super({
      name: 'query_enhancement',
      description: 'Enhances queries using context and conversation history',
      version: '1.0.0'
    });
    this.enhancementAgent = new EnhancementAgentImpl();
  }

  protected buildSequence(): RunnableSequence {
    return RunnableSequence.from([
      {
        name: 'query_enhancement',
        description: 'Enhances the query with context and history',
        invoke: async (input: EnhancementChainInput): Promise<EnhancementChainOutput> => {
          try {
            const result = await this.enhancementAgent.process(
              input.query,
              input.context,
              input.history
            );

            if (!result.success) {
              throw new Error(result.message || 'Failed to enhance query');
            }

            return {
              ...input,
              enhancedQuery: result.data.enhancedQuery,
              reasoning: result.data.reasoning
            };
          } catch (error) {
            throw new ChainError(
              error instanceof Error ? error.message : 'Failed to enhance query',
              this.metadata.name,
              { 
                query: input.query,
                context: input.context 
              }
            );
          }
        }
      }
    ]);
  }
} 