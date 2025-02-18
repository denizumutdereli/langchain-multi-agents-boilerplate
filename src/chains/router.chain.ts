import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { ChainError } from '../core/errors/error.types';
import { schemaRegistry } from '../core/registry/schema.registry';
import { logger } from '../utils/logger';
import { BaseChain } from './base.chain';

const RouterInputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  enhancedQuery: z.string(),
  reasoning: z.string(),
  relevantDocs: z.array(z.any()),
  context: z.string()
});

const RouterOutputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  enhancedQuery: z.string(),
  reasoning: z.string(),
  relevantDocs: z.array(z.any()),
  context: z.string(),
  processingType: z.enum(['realtime', 'historical']),
  routingReason: z.string(),
  metadata: z.object({
    routingConfidence: z.number(),
    routingTime: z.number(),
    features: z.array(z.string())
  })
});

export type RouterChainInput = z.infer<typeof RouterInputSchema>;
export type RouterChainOutput = z.infer<typeof RouterOutputSchema>;

export class RouterChain extends BaseChain<RouterChainInput, RouterChainOutput> {
  private realtimeKeywords = [
    'live',
    'current',
    'now',
    'today',
    'latest',
    'ongoing',
    'real-time',
    'realtime'
  ];

  constructor() {
    super({
      name: 'query_router',
      description: 'Routes queries to appropriate processing chains',
      version: '1.0.0',
      type: 'chain',
      inputType: 'RouterChainInput',
      outputType: 'RouterChainOutput'
    });

    // Register schemas
    schemaRegistry.register(RouterInputSchema, {
      name: 'RouterChainInput',
      description: 'Input format for query routing chain',
      version: '1.0.0',
      category: 'chain'
    });

    schemaRegistry.register(RouterOutputSchema, {
      name: 'RouterChainOutput',
      description: 'Output format for query routing chain',
      version: '1.0.0',
      category: 'chain'
    });
  }

  protected async buildSequence(): Promise<RunnableSequence> {
    return RunnableSequence.from([
      {
        name: 'query_routing',
        invoke: async (input: RouterChainInput): Promise<RouterChainOutput> => {
          try {
            // Validate input
            const validatedInput = schemaRegistry.validate<RouterChainInput>(
              'RouterChainInput',
              input
            );

            const startTime = Date.now();
            const features = this.extractFeatures(validatedInput.enhancedQuery);
            const isRealtime = this.isRealtimeQuery(validatedInput.enhancedQuery);
            
            const output: RouterChainOutput = {
              ...validatedInput,
              processingType: isRealtime ? 'realtime' : 'historical',
              routingReason: this.generateRoutingReason(features, isRealtime),
              metadata: {
                routingConfidence: this.calculateConfidence(features),
                routingTime: Date.now() - startTime,
                features
              }
            };

            // Validate output
            return schemaRegistry.validate<RouterChainOutput>(
              'RouterChainOutput',
              output
            );
          } catch (error) {
            logger.error('Query routing failed:', error);
            throw new ChainError(
              error instanceof Error ? error.message : 'Query routing failed',
              this.metadata.name,
              { phase: 'routing' }
            );
          }
        }
      }
    ]);
  }

  private isRealtimeQuery(query: string): boolean {
    const lowerQuery = query.toLowerCase();
    return this.realtimeKeywords.some(keyword => lowerQuery.includes(keyword));
  }

  private extractFeatures(query: string): string[] {
    const features: string[] = [];
    const lowerQuery = query.toLowerCase();

    // Time-based features
    if (this.realtimeKeywords.some(kw => lowerQuery.includes(kw))) {
      features.push('realtime_indicator');
    }
    if (lowerQuery.includes('history') || lowerQuery.includes('past')) {
      features.push('historical_indicator');
    }

    // Data type features
    if (lowerQuery.includes('stats') || lowerQuery.includes('statistics')) {
      features.push('statistics_request');
    }
    if (lowerQuery.includes('compare') || lowerQuery.includes('vs')) {
      features.push('comparison_request');
    }

    // Entity features
    if (lowerQuery.includes('team') || lowerQuery.includes('club')) {
      features.push('team_focus');
    }
    if (lowerQuery.includes('player')) {
      features.push('player_focus');
    }

    return features;
  }

  private generateRoutingReason(features: string[], isRealtime: boolean): string {
    const featureDescriptions = features.map(f => f.replace('_', ' ')).join(', ');
    return `Query ${isRealtime ? 'requires' : 'does not require'} realtime processing based on features: ${featureDescriptions}`;
  }

  private calculateConfidence(features: string[]): number {
    // Base confidence starts at 0.7
    let confidence = 0.7;

    // Adjust based on number of clear indicators
    const clearIndicators = features.filter(f => 
      f.includes('_indicator') || 
      f.includes('_request')
    ).length;

    // Each clear indicator adds 0.1 to confidence
    confidence += clearIndicators * 0.1;

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }
} 