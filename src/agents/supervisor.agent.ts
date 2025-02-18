import { Document } from '@langchain/core/documents';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents';
import { z } from 'zod';
import { config } from '../config/config';
import { QueryResponse } from '../interfaces/agent.interfaces';
import { chatMemoryManager } from '../memory/chat.memory';
import { cacheService } from '../services/cache.service';
import { ragService } from '../services/rag.service';
import { tools } from '../tools';
import { logger } from '../utils/logger';
import { EnhancementAgentImpl } from './internal/enhancement.agent';
import { SecurityAgentImpl } from './internal/security.agent';
import { AnalysisAgentImpl } from './user/analysis.agent';
import { RealtimeAgent } from './user/realtime.agent';

// Define structured output schemas
const RouterOutputSchema = z.object({
  destination: z.enum(['realtime', 'historical']),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  required_tools: z.array(z.string())
});

type RouterOutput = z.infer<typeof RouterOutputSchema>;

const QueryEnhancementSchema = z.object({
  enhanced_query: z.string(),
  reasoning: z.string(),
  focus_areas: z.array(z.string()),
  required_context: z.array(z.string())
});

type QueryEnhancement = z.infer<typeof QueryEnhancementSchema>;

export class SupervisorAgent {
  private mixtral: ChatGroq;
  private gpt4: ChatOpenAI;
  private realtimeAgent: RealtimeAgent;
  private enhancementAgent: EnhancementAgentImpl;
  private securityAgent: SecurityAgentImpl;
  private analysisAgent: AnalysisAgentImpl;
  private agentExecutor!: AgentExecutor;

  constructor() {
    console.log('Starting SupervisorAgent initialization...');
    try {
      this.mixtral = new ChatGroq({
        modelName: 'mixtral-8x7b-32768',
        temperature: 0.3,
        apiKey: config.groq.apiKey,
        cache: cacheService.getCache(),
      });

      this.gpt4 = new ChatOpenAI({
        modelName: 'gpt-4-turbo-preview',
        temperature: 0.7,
        openAIApiKey: config.openai.apiKey,
        cache: cacheService.getCache(),
      });

      this.realtimeAgent = new RealtimeAgent();
      this.enhancementAgent = new EnhancementAgentImpl();
      this.securityAgent = new SecurityAgentImpl();
      this.analysisAgent = new AnalysisAgentImpl();
      
      this.initializeAgents();
      
      console.log('SupervisorAgent initialization completed successfully');
    } catch (error) {
      console.error('Failed to initialize SupervisorAgent:', error);
      throw error;
    }
  }

  private async initializeAgents() {
    try {
      // Initialize main agent executor with OpenAI functions
      const agent = await createOpenAIFunctionsAgent({
        llm: this.gpt4,
        tools,
        prompt: ChatPromptTemplate.fromMessages([
          ['system', `You are a football analysis agent with access to various tools.
            Use them appropriately to answer queries about football statistics and performance.
            Always explain your reasoning and cite your sources.

            Available tools:
            ${tools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

            Follow these steps:
            1. Plan your approach
            2. Use appropriate tools
            3. Analyze results
            4. Provide comprehensive response`],
          new MessagesPlaceholder("chat_history"),
          ['human', '{input}'],
          new MessagesPlaceholder("agent_scratchpad"),
        ])
      });

      this.agentExecutor = AgentExecutor.fromAgentAndTools({
        agent,
        tools,
        verbose: false,
        maxIterations: 3,
        returnIntermediateSteps: true,
        handleParsingErrors: true
      });

    } catch (error) {
      logger.error('Failed to initialize agents:', error);
      throw error;
    }
  }

  async process(
    query: string, 
    chatId?: string,
    callbacks?: { onStep?: (step: string, context?: any) => void }
  ): Promise<QueryResponse> {
    const processingSteps: string[] = [];
    const memory = chatMemoryManager.getMemory(chatId || 'default');
    const { chat_history: history } = await memory.loadMemoryVariables({});

    // Convert BaseMessage[] to the expected format with proper types
    const formattedHistory = history.map((msg: BaseMessage) => {
      let role: 'user' | 'system' | 'assistant';
      if (msg instanceof HumanMessage) {
        role = 'user';
      } else if (msg instanceof AIMessage) {
        role = 'assistant';
      } else {
        role = 'system';
      }
      
      return {
        role,
        content: String(msg.content),
        timestamp: new Date().toISOString()
      };
    });

    const emitStep = (step: string, context?: any) => {
      processingSteps.push(step);
      callbacks?.onStep?.(step, context);
    };

    try {
      // Step 1: Validate query
      emitStep('Validating query security and scope...', {
        agent: 'SecurityAgent',
        model: 'GPT-4',
        tools: []
      });
      const securityResult = await this.securityAgent.process(query, chatId || '', formattedHistory);
      if (!securityResult.success) {
        throw new Error(securityResult.message);
      }
      emitStep('Query validation passed', {
        agent: 'SecurityAgent',
        model: 'GPT-4',
        result: 'valid'
      });

      // Step 2: Get relevant context
      emitStep('Retrieving relevant context...', {
        agent: 'SupervisorAgent',
        tools: ['RAG Service']
      });
      let relevantDocs: Document[] = [];
      try {
        relevantDocs = await ragService.findRelevantContext(query) || [];
        emitStep(`Found ${relevantDocs.length} relevant documents`, {
          agent: 'SupervisorAgent',
          tools: ['RAG Service'],
          context: relevantDocs.map(doc => ({
            type: doc.metadata.type,
            team: doc.metadata.team,
            year: doc.metadata.year
          }))
        });
      } catch (error) {
        logger.warn('Failed to retrieve context:', error);
        emitStep('No relevant context found', {
          agent: 'SupervisorAgent',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Step 3: Enhance query with context
      emitStep('Enhancing query with context...', {
        agent: 'EnhancementAgent',
        model: 'GPT-4',
        tools: []
      });
      const enhancementResult = await this.enhancementAgent.process(
        query,
        chatId || '',
        formattedHistory,
        relevantDocs.map(doc => doc.pageContent).join('\n\n')
      );
      const enhanced = enhancementResult.message;
      emitStep('Query enhanced', {
        agent: 'EnhancementAgent',
        model: 'GPT-4',
        result: enhanced,
        reasoning: enhancementResult.reasoning
      });

      // Step 4: Determine if this is a real-time or historical query
      emitStep('Determining appropriate data source...', {
        agent: 'SupervisorAgent',
        model: 'Mixtral-8x7b',
        tools: []
      });

      let result: QueryResponse | undefined;

      // Check if query requires real-time data
      const isRealtime = enhanced.toLowerCase().includes('current') || 
                        enhanced.toLowerCase().includes('live') ||
                        enhanced.toLowerCase().includes('today');

      if (isRealtime) {
        // Use realtime agent for current data
        emitStep('Processing with real-time agent...', {
          agent: 'RealtimeAgent',
          model: 'Mixtral-8x7b',
          tools: ['live_scores', 'leaderboard', 'player_stats']
        });
        
        try {
          const realtimeResult = await this.realtimeAgent.process(enhanced);
          emitStep('Real-time data retrieved', {
            agent: 'RealtimeAgent',
            tools_used: realtimeResult.data?.tools_used || ['leaderboard'],
            success: true
          });
          
          result = {
            query: enhanced,
            analysis: {
              result: realtimeResult.message,
              confidence: 1.0,
              tools_used: realtimeResult.data?.tools_used || ['leaderboard']
            },
            context: {
              sources: [
                {
                  type: 'realtime',
                  team: realtimeResult.data?.team,
                  timeframe: 'current'
                }
              ],
              timeframe: 'current'
            },
            reasoning: [
              ...processingSteps,
              realtimeResult.reasoning || ''
            ]
          };
        } catch (error) {
          logger.error('Real-time agent processing failed:', error);
          emitStep('Falling back to historical agent due to real-time processing failure', {
            agent: 'RealtimeAgent',
            error: error instanceof Error ? error.message : 'Unknown error',
            action: 'fallback'
          });
        }
      }

      if (!result) {
        // Use analysis agent for historical data
        emitStep('Processing with historical data agent...', {
          agent: 'AnalysisAgent',
          model: 'GPT-4',
          tools: ['football_data', 'stats_calculator', 'timeframe']
        });

        const analysisResult = await this.analysisAgent.process(
          enhanced,
          chatId || '',
          formattedHistory
        );

        if (!analysisResult.success) {
          throw new Error(analysisResult.message);
        }

        emitStep('Historical data analysis complete', {
          agent: 'AnalysisAgent',
          success: true,
          tools_used: analysisResult.data?.tools_used || []
        });

        result = {
          query: enhanced,
          analysis: {
            result: analysisResult.message,
            confidence: 0.85,
            tools_used: analysisResult.data?.tools_used || []
          },
          context: {
            sources: analysisResult.data?.sources || [],
            timeframe: this.extractTimeframe(relevantDocs)
          },
          reasoning: [
            ...processingSteps,
            analysisResult.reasoning || ''
          ]
        };
      }

      // Update chat history with formatted messages
      await memory.saveContext(
        { input: query },
        { output: result.analysis.result }
      );

      return result;
    } catch (error) {
      logger.error('Query processing failed:', error);
      throw error;
    }
  }

  private extractTimeframe(documents: Document[]): string {
    const years = documents
      .map(doc => doc.metadata.year || doc.metadata.season)
      .filter(Boolean);
    
    if (years.length === 0) return 'recent';
    if (years.length === 1) return years[0];
    return `${Math.min(...years)}-${Math.max(...years)}`;
  }
} 