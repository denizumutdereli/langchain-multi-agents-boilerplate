import { z } from 'zod';

// Base schemas for validation
export const MessageSchema = z.object({
    role: z.enum(['user', 'assistant', 'system', 'function']),
    content: z.string(),
    name: z.string().optional(),
    functionCall: z.any().optional(),
});

export const ChatHistorySchema = z.object({
    id: z.string(),
    title: z.string(),
    messages: z.array(MessageSchema),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export const AgentConfigSchema = z.object({
    modelName: z.string(),
    temperature: z.number().min(0).max(2),
    maxTokens: z.number().default(500),
    verbose: z.boolean().default(false),
    reasoning: z.boolean().default(true),
});

// Type exports
export type Message = z.infer<typeof MessageSchema>;
export type ChatHistory = z.infer<typeof ChatHistorySchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;

// Enums
export enum AgentType {
    SUPERVISOR = 'supervisor',
    ANALYSIS = 'analysis',
    REALTIME = 'realtime',
    ENHANCEMENT = 'enhancement',
    SECURITY = 'security',
}

export enum ModelProvider {
    OPENAI = 'openai',
    GROQ = 'groq',
} 