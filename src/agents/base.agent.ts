import { ChatPromptTemplate } from '@langchain/core/prompts';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config/config';
import { AgentResponse, ChatMessage } from '../interfaces/agent.interfaces';

export abstract class BaseAgentImpl {
  protected openaiModel: ChatOpenAI;
  protected prompt: ChatPromptTemplate;

  constructor(prompt: ChatPromptTemplate) {
    this.openaiModel = new ChatOpenAI({
      modelName: 'gpt-4-turbo-preview',
      temperature: 0.7,
      openAIApiKey: config.openai.apiKey,
    });
    this.prompt = prompt;
  }

  abstract process(input: string, userId: string, chatHistory?: ChatMessage[]): Promise<AgentResponse>;
} 