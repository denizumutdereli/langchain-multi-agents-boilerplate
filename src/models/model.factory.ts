import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatGroq } from '@langchain/groq';
import { ChatOpenAI } from '@langchain/openai';

export type ModelType = 'gpt4' | 'gpt3' | 'mixtral' | 'llama2';

interface ModelConfig {
  temperature?: number;
  maxTokens?: number;
}

export class ModelFactory {
  private static instance: ModelFactory;
  private modelCache: Map<string, BaseChatModel> = new Map();

  private constructor() {}

  static getInstance(): ModelFactory {
    if (!ModelFactory.instance) {
      ModelFactory.instance = new ModelFactory();
    }
    return ModelFactory.instance;
  }

  getModel(type: ModelType, config: ModelConfig = {}): BaseChatModel {
    const cacheKey = `${type}-${JSON.stringify(config)}`;
    
    if (this.modelCache.has(cacheKey)) {
      return this.modelCache.get(cacheKey)!;
    }

    const model = this.createModel(type, config);
    this.modelCache.set(cacheKey, model);
    return model;
  }

  private createModel(type: ModelType, config: ModelConfig): BaseChatModel {
    const { temperature = 0.7, maxTokens = config.models.maxTokens } = config;

    switch (type) {
      case 'gpt4':
        return new ChatOpenAI({
          modelName: 'gpt-4',
          temperature,
          maxTokens,
          openAIApiKey: config.openai.apiKey,
        });

      case 'gpt3':
        return new ChatOpenAI({
          modelName: 'gpt-3.5-turbo',
          temperature,
          maxTokens,
          openAIApiKey: config.openai.apiKey,
        });

      case 'mixtral':
        return new ChatGroq({
          modelName: 'mixtral-8x7b-32768',
          temperature,
          apiKey: config.groq.apiKey,
        });

      case 'llama2':
        return new ChatGroq({
          modelName: 'llama2-70b-4096',
          temperature,
          apiKey: config.groq.apiKey,
        });

      default:
        throw new Error(`Unsupported model type: ${type}`);
    }
  }
} 