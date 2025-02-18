import { Document } from '@langchain/core/documents';
import { BaseMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseChain } from '../../core/base/chain.base';
import { ChainError } from '../../core/errors/base.error';
import { ragService } from '../../services/rag.service';

export interface ContextChainInput {
  query: string;
  chatId: string;
  history: BaseMessage[];
  securityValidated: boolean;
}

export interface ContextChainOutput extends ContextChainInput {
  relevantDocs: Document[];
  context: string;
}

export class ContextChain extends BaseChain<ContextChainInput, ContextChainOutput> {
  constructor() {
    super({
      name: 'context_retrieval',
      description: 'Retrieves relevant context from the RAG service',
      version: '1.0.0'
    });
  }

  protected buildSequence(): RunnableSequence {
    return RunnableSequence.from([
      {
        name: 'context_retrieval',
        description: 'Retrieves and processes relevant context',
        invoke: async (input: ContextChainInput): Promise<ContextChainOutput> => {
          try {
            const docs = await ragService.findRelevantContext(input.query);
            
            return {
              ...input,
              relevantDocs: docs,
              context: docs.map(doc => doc.pageContent).join('\n')
            };
          } catch (error) {
            throw new ChainError(
              error instanceof Error ? error.message : 'Failed to retrieve context',
              this.metadata.name,
              { query: input.query }
            );
          }
        }
      }
    ]);
  }
} 