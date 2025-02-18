import { Document } from '@langchain/core/documents';
import { BaseMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseChain } from '../../core/base/chain.base';
import { ChainError } from '../../core/errors/base.error';

export interface RouterChainInput {
  query: string;
  chatId: string;
  history: BaseMessage[];
  enhancedQuery: string;
  reasoning: string;
  relevantDocs: Document[];
  context: string;
}

export interface RouterChainOutput extends RouterChainInput {
  processingType: 'realtime' | 'historical';
  routingReason: string;
}

export class RouterChain extends BaseChain<RouterChainInput, RouterChainOutput> {
  constructor() {
    super({
      name: 'query_router',
      description: 'Routes queries to appropriate processing chains',
      version: '1.0.0'
    });
  }

  private isRealtimeQuery(query: string): boolean {
    const realtimeKeywords = [
      'live',
      'current',
      'now',
      'today',
      'latest',
      'ongoing',
      'real-time',
      'realtime'
    ];
    return realtimeKeywords.some(keyword => 
      query.toLowerCase().includes(keyword)
    );
  }

  protected buildSequence(): RunnableSequence {
    return RunnableSequence.from([
      {
        name: 'query_routing',
        description: 'Routes query to realtime or historical processing',
        invoke: async (input: RouterChainInput): Promise<RouterChainOutput> => {
          try {
            const isRealtime = this.isRealtimeQuery(input.enhancedQuery);
            
            return {
              ...input,
              processingType: isRealtime ? 'realtime' : 'historical',
              routingReason: isRealtime 
                ? 'Query contains realtime indicators'
                : 'Query appears to be for historical analysis'
            };
          } catch (error) {
            throw new ChainError(
              error instanceof Error ? error.message : 'Failed to route query',
              this.metadata.name,
              { 
                query: input.query,
                enhancedQuery: input.enhancedQuery
              }
            );
          }
        }
      }
    ]);
  }
} 