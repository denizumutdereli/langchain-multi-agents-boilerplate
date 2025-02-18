import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatGroq } from '@langchain/groq';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { z } from 'zod';
import { config } from '../../config/config';
import { AgentResponse } from '../../interfaces/agent.interfaces';
import { tools } from '../../tools';
import { logger } from '../../utils/logger';

interface AgentStep {
  action: {
    tool: string;
    toolInput: string;
  };
}

const RealtimeResponseSchema = z.object({
  type: z.enum(['live_match', 'standings', 'player_stats']),
  data: z.any(),
  timestamp: z.string(),
  source: z.string(),
  confidence: z.number(),
  tools_used: z.array(z.string()),
});

export class RealtimeAgent {
  private mixtral: ChatGroq;
  private outputParser: StructuredOutputParser<typeof RealtimeResponseSchema>;
  private realtimeTools = tools.filter(tool => 
    ['live_scores', 'leaderboard', 'player_stats'].includes(tool.name)
  );
  private agentExecutor!: AgentExecutor;

  constructor() {
    this.mixtral = new ChatGroq({
      modelName: 'mixtral-8x7b-32768',
      temperature: 0.3,
      apiKey: config.groq.apiKey,
    });

    this.outputParser = StructuredOutputParser.fromZodSchema(RealtimeResponseSchema);
    this.initializeAgent();
  }

  private async initializeAgent() {
    try {
      const agent = await createOpenAIFunctionsAgent({
        llm: this.mixtral,
        tools,
        prompt: ChatPromptTemplate.fromMessages([
          ['system', `You are a real-time football data analyst.
            Focus on current matches, live scores, and immediate statistics.
            Use the tools appropriately to gather and analyze real-time data.
            Always explain your reasoning and cite your sources.`],
          new MessagesPlaceholder("chat_history"),
          ['human', '{input}'],
          new MessagesPlaceholder("agent_scratchpad"),
        ])
      });

      this.agentExecutor = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        verbose: false,
        maxIterations: 3
      });

    } catch (error) {
      logger.error('Failed to initialize realtime agent:', error);
      throw error;
    }
  }

  async process(input: string): Promise<AgentResponse> {
    try {
      logger.debug('Realtime agent processing input:', input);

      const result = await this.agentExecutor.invoke({
        input,
        chat_history: []
      });

      return {
        success: true,
        message: result.output,
        data: {
          tools_used: result.intermediateSteps?.map((step: AgentStep) => step.action.tool) || []
        }
      };

    } catch (error) {
      logger.error('Realtime processing failed:', error);
      return {
        success: false,
        message: 'Failed to process realtime data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async executeTools(type: 'live_match' | 'standings' | 'player_stats', query: string): Promise<any> {
    const toolMap = {
      'live_match': 'live_scores',
      'standings': 'leaderboard',
      'player_stats': 'player_stats'
    };

    const tool = this.realtimeTools.find(t => t.name === toolMap[type]);
    if (!tool) {
      throw new Error(`No tool found for type: ${type}`);
    }

    const result = await tool.invoke(query);
    return JSON.parse(result);
  }
} 