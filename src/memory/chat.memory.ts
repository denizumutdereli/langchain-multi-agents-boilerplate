import { ChatOpenAI } from '@langchain/openai';
import { ConversationSummaryBufferMemory } from 'langchain/memory';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class ChatMemoryManager {
  private static instance: ChatMemoryManager;
  private memories: Map<string, ConversationSummaryBufferMemory> = new Map();

  private constructor() {}

  static getInstance(): ChatMemoryManager {
    if (!ChatMemoryManager.instance) {
      ChatMemoryManager.instance = new ChatMemoryManager();
    }
    return ChatMemoryManager.instance;
  }

  getMemory(chatId: string): ConversationSummaryBufferMemory {
    if (!this.memories.has(chatId)) {
      const memory = new ConversationSummaryBufferMemory({
        llm: new ChatOpenAI({
          modelName: 'gpt-4-turbo-preview',
          temperature: 0.3,
          openAIApiKey: config.openai.apiKey,
        }),
        maxTokenLimit: 2000,
        returnMessages: true,
        memoryKey: 'chat_history',
        humanPrefix: 'Human',
        aiPrefix: 'Assistant',
      });

      this.memories.set(chatId, memory);
      logger.debug(`Created new memory for chat ${chatId}`);
    }

    return this.memories.get(chatId)!;
  }

  async clearMemory(chatId: string): Promise<void> {
    const memory = this.memories.get(chatId);
    if (memory) {
      await memory.clear();
      this.memories.delete(chatId);
      logger.debug(`Cleared memory for chat ${chatId}`);
    }
  }

  async saveContext(
    chatId: string,
    input: { [key: string]: string },
    output: { [key: string]: string }
  ): Promise<void> {
    const memory = this.getMemory(chatId);
    await memory.saveContext(input, output);
    logger.debug(`Saved context for chat ${chatId}`);
  }

  async loadMemoryVariables(chatId: string): Promise<{ [key: string]: any }> {
    const memory = this.getMemory(chatId);
    return memory.loadMemoryVariables({});
  }
}

export const chatMemoryManager = ChatMemoryManager.getInstance(); 