import { BaseMessage } from '@langchain/core/messages';
import { RunnableSequence } from '@langchain/core/runnables';
import { BaseChain } from '../../core/base/chain.base';
import { SecurityError } from '../../core/errors/base.error';
import { SecurityAgentImpl } from '../internal/security.agent';

export interface SecurityChainInput {
  query: string;
  chatId: string;
  history: BaseMessage[];
}

export interface SecurityChainOutput extends SecurityChainInput {
  securityValidated: boolean;
  validationDetails?: {
    score: number;
    flags: string[];
    category: string;
  };
}

export class SecurityChain extends BaseChain<SecurityChainInput, SecurityChainOutput> {
  private securityAgent: SecurityAgentImpl;

  constructor() {
    super({
      name: 'security_validation',
      description: 'Validates input queries for security and domain compliance',
      version: '1.0.0'
    });
    this.securityAgent = new SecurityAgentImpl();
  }

  protected buildSequence(): RunnableSequence {
    return RunnableSequence.from([
      {
        name: 'security_validation',
        description: 'Validates input for security concerns',
        invoke: async (input: SecurityChainInput): Promise<SecurityChainOutput> => {
          const result = await this.securityAgent.process(
            input.query,
            input.chatId,
            input.history
          );

          if (!result.success) {
            throw new SecurityError(result.message || 'Security validation failed', {
              query: input.query,
              reason: result.reasoning
            });
          }

          return {
            ...input,
            securityValidated: true,
            validationDetails: {
              score: result.data?.score || 1.0,
              flags: result.data?.flags || [],
              category: result.data?.category || 'general'
            }
          };
        }
      }
    ]);
  }
} 