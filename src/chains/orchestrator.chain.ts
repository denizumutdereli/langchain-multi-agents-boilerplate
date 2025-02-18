import { RunnableSequence } from '@langchain/core/runnables';
import { z } from 'zod';
import { ChainError } from '../core/errors/error.types';
import { schemaRegistry } from '../core/registry/schema.registry';
import { logger } from '../utils/logger';
import { BaseChain } from './base.chain';
import { ContextChain } from './context.chain';
import { EnhancementChain } from './enhancement.chain';
import { RouterChain } from './router.chain';
import { SecurityChain } from './security.chain';

const OrchestratorInputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any())
});

const OrchestratorOutputSchema = z.object({
  query: z.string(),
  chatId: z.string(),
  history: z.array(z.any()),
  enhancedQuery: z.string(),
  reasoning: z.string(),
  relevantDocs: z.array(z.any()),
  context: z.string(),
  processingType: z.enum(['realtime', 'historical']),
  routingReason: z.string(),
  securityStatus: z.object({
    isAllowed: z.boolean(),
    reason: z.string()
  }),
  metadata: z.object({
    processingTime: z.number(),
    chainResults: z.record(z.string(), z.any())
  })
});

export type OrchestratorChainInput = z.infer<typeof OrchestratorInputSchema>;
export type OrchestratorChainOutput = z.infer<typeof OrchestratorOutputSchema>;

export class OrchestratorChain extends BaseChain<OrchestratorChainInput, OrchestratorChainOutput> {
  private securityChain: SecurityChain;
  private contextChain: ContextChain;
  private enhancementChain: EnhancementChain;
  private routerChain: RouterChain;

  constructor() {
    super({
      name: 'orchestrator',
      description: 'Orchestrates the execution of all chains in the proper sequence',
      version: '1.0.0',
      type: 'chain',
      inputType: 'OrchestratorChainInput',
      outputType: 'OrchestratorChainOutput'
    });

    // Initialize all chains
    this.securityChain = new SecurityChain();
    this.contextChain = new ContextChain();
    this.enhancementChain = new EnhancementChain();
    this.routerChain = new RouterChain();

    // Register schemas
    schemaRegistry.register(OrchestratorInputSchema, {
      name: 'OrchestratorChainInput',
      description: 'Input format for orchestrator chain',
      version: '1.0.0',
      category: 'chain'
    });

    schemaRegistry.register(OrchestratorOutputSchema, {
      name: 'OrchestratorChainOutput',
      description: 'Output format for orchestrator chain',
      version: '1.0.0',
      category: 'chain'
    });
  }

  protected async buildSequence(): Promise<RunnableSequence> {
    return RunnableSequence.from([
      {
        name: 'orchestration',
        invoke: async (input: OrchestratorChainInput): Promise<OrchestratorChainOutput> => {
          try {
            const startTime = Date.now();
            const chainResults: Record<string, any> = {};

            // Validate input
            const validatedInput = schemaRegistry.validate<OrchestratorChainInput>(
              'OrchestratorChainInput',
              input
            );

            // 1. Security Check
            logger.info('Running security check...');
            const securityResult = await this.securityChain.invoke(validatedInput);
            chainResults['security'] = securityResult;

            if (!securityResult.isAllowed) {
              return this.createBlockedResponse(validatedInput, securityResult, startTime);
            }

            // 2. Context Retrieval
            logger.info('Retrieving context...');
            const contextResult = await this.contextChain.invoke(validatedInput);
            chainResults['context'] = contextResult;

            // 3. Query Enhancement
            logger.info('Enhancing query...');
            const enhancementResult = await this.enhancementChain.invoke({
              ...validatedInput,
              relevantDocs: contextResult.relevantDocs,
              context: contextResult.context
            });
            chainResults['enhancement'] = enhancementResult;

            // 4. Query Routing
            logger.info('Routing query...');
            const routerResult = await this.routerChain.invoke({
              ...enhancementResult,
              relevantDocs: contextResult.relevantDocs,
              context: contextResult.context
            });
            chainResults['router'] = routerResult;

            // Prepare final output
            const output: OrchestratorChainOutput = {
              ...routerResult,
              securityStatus: {
                isAllowed: securityResult.isAllowed,
                reason: securityResult.reason
              },
              metadata: {
                processingTime: Date.now() - startTime,
                chainResults
              }
            };

            // Validate output
            return schemaRegistry.validate<OrchestratorChainOutput>(
              'OrchestratorChainOutput',
              output
            );
          } catch (error) {
            logger.error('Orchestration failed:', error);
            throw new ChainError(
              error instanceof Error ? error.message : 'Orchestration failed',
              this.metadata.name,
              { phase: 'orchestration' }
            );
          }
        }
      }
    ]);
  }

  private createBlockedResponse(
    input: OrchestratorChainInput,
    securityResult: any,
    startTime: number
  ): OrchestratorChainOutput {
    return {
      ...input,
      enhancedQuery: input.query,
      reasoning: 'Query blocked by security check',
      relevantDocs: [],
      context: '',
      processingType: 'historical',
      routingReason: 'Processing stopped due to security check',
      securityStatus: {
        isAllowed: false,
        reason: securityResult.reason
      },
      metadata: {
        processingTime: Date.now() - startTime,
        chainResults: {
          security: securityResult
        }
      }
    };
  }

  public async cleanup(): Promise<void> {
    await Promise.all([
      this.securityChain.cleanup(),
      this.contextChain.cleanup(),
      this.enhancementChain.cleanup(),
      this.routerChain.cleanup()
    ]);
  }
} 