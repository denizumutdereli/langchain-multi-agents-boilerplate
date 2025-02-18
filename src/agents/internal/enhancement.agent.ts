import { AgentResponse, ChatMessage, EnhancementAgent } from '../../interfaces/agent.interfaces';
import { enhancementPrompt } from '../../prompts/base.prompts';
import { logger } from '../../utils/logger';
import { BaseAgentImpl } from '../base.agent';

export class EnhancementAgentImpl extends BaseAgentImpl implements EnhancementAgent {
  constructor() {
    super(enhancementPrompt);
  }

  async process(
    input: string,
    userId: string,
    chatHistory?: ChatMessage[],
    context?: string
  ): Promise<AgentResponse> {
    try {
      logger.debug('Enhancement agent processing input:', input);

      const chain = this.prompt
        .pipe(this.openaiModel);

      const result = await chain.invoke({
        input,
        chat_history: chatHistory || [],
        context: context || ''
      });

      const response = result.content as string;
      const [enhancedQuery, reasoning] = response.split('\nREASONING:').map(s => s.trim());

      return {
        success: true,
        message: enhancedQuery.replace('ENHANCED QUERY:', '').trim(),
        reasoning: reasoning || 'Query enhanced based on context and history',
        data: {
          original_query: input,
          context_used: !!context,
          history_used: Array.isArray(chatHistory) && chatHistory.length > 0
        }
      };

    } catch (error) {
      logger.error('Enhancement agent failed:', error);
      return {
        success: false,
        message: 'Failed to enhance query',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
} 