import { z } from 'zod';

export const AgentResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
  reasoning: z.string().optional(),
  sources: z.array(z.string()).optional(),
});

export type AgentResponse = z.infer<typeof AgentResponseSchema>;

export const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string(),
});

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatHistorySchema = z.object({
  id: z.string(),
  title: z.string(),
  messages: z.array(ChatMessageSchema),
  createdAt: z.string(),
});

export type ChatHistory = z.infer<typeof ChatHistorySchema>;

export interface BaseAgent {
  process(input: string, userId: string, chatHistory?: ChatMessage[]): Promise<AgentResponse>;
}

export interface SupervisorAgent extends BaseAgent {
  delegateTask(input: string, userId: string): Promise<string[]>;
  coordinateAgents(agents: string[], input: string, userId: string): Promise<AgentResponse>;
}

export interface SecurityAgent extends BaseAgent {}

export interface EnhancementAgent extends BaseAgent {}

export interface AnalysisAgent extends BaseAgent {
  process(input: string, userId: string, chatHistory?: ChatMessage[]): Promise<AgentResponse>;
}

export interface StatsAgent extends BaseAgent {}

export interface DocumentSource {
  type: string;
  team?: string;
  year?: string;
  tournament?: string;
  season?: string;
  timeframe?: string;
}

export interface QueryResponse {
  query: string;
  analysis: {
    result: string;
    confidence: number;
    tools_used: string[];
  };
  context: {
    sources: DocumentSource[];
    timeframe: string;
  };
  reasoning: string[];
}

export interface ProcessingStep {
  phase: string;
  model: string;
  action: string;
  result: string;
  error?: string;
}

export interface AgentAction {
  tool: string;
  error?: string;
}

export interface AgentStep {
  action: AgentAction;
} 