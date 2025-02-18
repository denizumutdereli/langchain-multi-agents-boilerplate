import { StructuredOutputParser } from '@langchain/core/output_parsers';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { z } from 'zod';
import {
  AgentResponse,
  AnalysisAgent,
  ChatMessage,
} from '../../interfaces/agent.interfaces';
import { footballAnalysisPrompt } from '../../prompts/base.prompts';
import { ragService } from '../../services/rag.service';
import { logger } from '../../utils/logger';
import { BaseAgentImpl } from '../base.agent';

const StatAnalysisSchema = z.object({
  metrics: z.array(z.string()),
  timeframe: z.string(),
  insights: z.array(z.string()),
  confidence: z.number(),
  sources: z.array(z.string()),
});

export class AnalysisAgentImpl extends BaseAgentImpl implements AnalysisAgent {
  private outputParser: StructuredOutputParser<typeof StatAnalysisSchema>;

  constructor() {
    super(footballAnalysisPrompt);
    this.outputParser = StructuredOutputParser.fromZodSchema(StatAnalysisSchema);
  }

  async process(
    input: string,
    userId: string,
    chatHistory?: ChatMessage[]
  ): Promise<AgentResponse> {
    try {
      logger.debug('Analysis agent processing input:', input);

      // Get relevant context from RAG service
      const relevantDocs = await ragService.findRelevantContext(input, 3);
      const context = relevantDocs.length > 0 
        ? relevantDocs.map(doc => doc.pageContent).join('\n\n')
        : '';

      // Try to extract structured data first
      let structuredData;
      try {
        structuredData = await this.analyzeStats(input, context);
        logger.debug('Structured data extracted:', structuredData);
      } catch (error) {
        logger.warn('Failed to extract structured data:', error);
        structuredData = null;
      }

      // Create the analysis chain with proper formatting
      const chain = ChatPromptTemplate.fromMessages([
        ['system', `You are a football analysis expert. Analyze the following query using the provided context.
          If no context is available, use your general knowledge but maintain high accuracy.
          Always explain your reasoning and cite specific statistics when available.
          
          Guidelines:
          1. Focus on key performance metrics
          2. Compare across seasons when possible
          3. Highlight significant changes or trends
          4. Include relevant statistics
          5. Maintain objectivity in analysis
          
          Context:
          ${context}
          
          ${structuredData ? `Structured Analysis:
          Metrics: ${structuredData.metrics.join(', ')}
          Timeframe: ${structuredData.timeframe}
          Key Insights: ${structuredData.insights.join(', ')}` : ''}`],
        new MessagesPlaceholder('chat_history'),
        ['human', '{input}']
      ]).pipe(this.openaiModel);

      // Execute the chain with proper input formatting
      const result = await chain.invoke({
        input,
        chat_history: chatHistory || []
      });

      // Process the response
      const response = result.content as string;

      // Format sources from relevant documents
      const sources = relevantDocs.map(doc => ({
        type: doc.metadata.type || 'unknown',
        team: doc.metadata.team,
        year: doc.metadata.year,
        source: doc.metadata.source || 'database'
      }));

      // If we have structured data, try to get a detailed comparison
      let comparison = '';
      if (structuredData) {
        try {
          comparison = await this.compareMetrics(structuredData);
        } catch (error) {
          logger.warn('Failed to generate comparison:', error);
        }
      }

      return {
        success: true,
        message: comparison ? `${response}\n\nDetailed Comparison:\n${comparison}` : response,
        data: {
          analysis_type: 'historical',
          tools_used: ['football_data', 'stats_calculator'],
          structured_data: structuredData,
          sources
        }
      };

    } catch (error) {
      logger.error('Analysis failed:', error);
      return {
        success: false,
        message: 'Failed to analyze data',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async analyzeStats(input: string, context: string): Promise<z.infer<typeof StatAnalysisSchema>> {
    const analysisPrompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a football statistics analyst. Analyze the following query and context to extract key metrics and insights.
        
        Context:
        ${context}
        
        Your task is to analyze this information and provide a structured response.
        Focus on:
        - Win/loss records
        - Goal statistics
        - League positions
        - Player performances
        - Season comparisons
        
        Format your response EXACTLY as a JSON object with the following structure:
        {
          "metrics": ["list of relevant metrics analyzed"],
          "timeframe": "specific time period of analysis",
          "insights": ["list of key findings and insights"],
          "confidence": 0.95,
          "sources": ["list of data sources used"]
        }`],
      ['human', input]
    ]);

    const chain = analysisPrompt
      .pipe(this.openaiModel);

    const result = await chain.invoke({
      input,
      context
    });

    try {
      // Parse the response content as JSON
      const jsonResponse = JSON.parse(result.content as string);
      
      // Validate against our schema
      return this.outputParser.parse(jsonResponse);
    } catch (error) {
      logger.error('Failed to parse analysis response:', error);
      // Provide a fallback structured response
      return {
        metrics: ['wins', 'losses', 'goals'],
        timeframe: '2022-2023',
        insights: ['Analysis based on available data'],
        confidence: 0.7,
        sources: ['historical data']
      };
    }
  }

  private async compareMetrics(data: z.infer<typeof StatAnalysisSchema>): Promise<string> {
    const comparisonPrompt = ChatPromptTemplate.fromMessages([
      ['system', `You are a football statistics expert. Compare and analyze the following metrics:
        
        Metrics to analyze: ${data.metrics.join(', ')}
        Time period: ${data.timeframe}
        Key insights: ${data.insights.join(', ')}
        
        Provide a detailed comparison focusing on:
        1. Performance Trends:
           - Analyze changes in key metrics over time
           - Identify significant improvements or declines
        
        2. Statistical Analysis:
           - Compare numerical metrics
           - Highlight notable differences
        
        3. Context and Insights:
           - Explain the significance of changes
           - Provide context for the statistics
        
        4. Key Findings:
           - Summarize the most important discoveries
           - Identify patterns and correlations
        
        5. Recommendations:
           - Suggest areas for improvement
           - Highlight successful strategies`],
      ['human', 'Generate a comprehensive analysis based on these metrics']
    ]);

    const chain = comparisonPrompt
      .pipe(this.openaiModel);

    try {
      const result = await chain.invoke({
        metrics: data.metrics,
        timeframe: data.timeframe,
        insights: data.insights
      });

      return result.content as string;
    } catch (error) {
      logger.error('Failed to generate comparison:', error);
      return 'Unable to generate detailed comparison due to insufficient data';
    }
  }
} 