import { AgentResponse, ChatMessage, SecurityAgent } from '../../interfaces/agent.interfaces';
import { securityPrompt } from '../../prompts/base.prompts';
import { logger } from '../../utils/logger';
import { BaseAgentImpl } from '../base.agent';

export class SecurityAgentImpl extends BaseAgentImpl implements SecurityAgent {
  constructor() {
    super(securityPrompt);
  }

  async process(
    input: string,
    userId: string,
    chatHistory?: ChatMessage[]
  ): Promise<AgentResponse> {
    try {
      logger.debug('Security agent validating input:', input);

      const chain = this.prompt
        .pipe(this.openaiModel);

      const result = await chain.invoke({
        input,
        context: chatHistory ? JSON.stringify(chatHistory) : ''
      });

      const response = result.content as string;
      const isValid = response.toLowerCase().startsWith('valid');
      const reasoning = response.split('\n')[1] || '';

      return {
        success: isValid,
        message: isValid ? 'Input validation passed' : 'Input validation failed',
        reasoning,
        data: {
          is_valid: isValid,
          original_input: input
        }
      };

    } catch (error) {
      logger.error('Security validation failed:', error);
      return {
        success: false,
        message: 'Failed to validate input',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 