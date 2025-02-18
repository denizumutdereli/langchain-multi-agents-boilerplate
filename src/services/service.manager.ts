import { logger } from '../utils/logger';
import { ragService } from './rag.service';
import { redisService } from './redis.service';

export class ServiceManager {
  private static instance: ServiceManager;
  private isInitialized = false;
  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  private constructor() {}

  static getInstance(): ServiceManager {
    if (!ServiceManager.instance) {
      ServiceManager.instance = new ServiceManager();
    }
    return ServiceManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize Redis first as it's a critical dependency
      await this.initializeWithRetry(
        () => redisService.initialize(),
        'Redis',
        true
      );

      // Initialize RAG service with retry but not critical
      await this.initializeWithRetry(
        () => ragService.initialize(),
        'RAG',
        false
      );

      this.isInitialized = true;
      logger.info('All services initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize services:', error);
      throw error;
    }
  }

  async getChatHistory(chatId: string): Promise<any | null> {
    try {
      return await redisService.getChatHistory(chatId);
    } catch (error) {
      logger.error('Failed to get chat history:', error);
      throw error;
    }
  }

  async saveChatHistory(messages: any[], title: string): Promise<string> {
    try {
      return await redisService.saveChatHistory(messages, title);
    } catch (error) {
      logger.error('Failed to save chat history:', error);
      throw error;
    }
  }

  private async initializeWithRetry(
    initFn: () => Promise<void>,
    serviceName: string,
    isCritical: boolean
  ): Promise<void> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await initFn();
        logger.info(`${serviceName} service initialized successfully`);
        return;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          `Attempt ${attempt}/${this.maxRetries} to initialize ${serviceName} service failed:`,
          lastError
        );

        if (attempt < this.maxRetries) {
          await this.delay(this.retryDelay * attempt); // Exponential backoff
        }
      }
    }

    if (isCritical) {
      throw new Error(
        `Failed to initialize critical service ${serviceName} after ${this.maxRetries} attempts: ${lastError?.message}`
      );
    } else {
      logger.error(
        `Non-critical service ${serviceName} failed to initialize, continuing without it`
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async healthCheck(): Promise<{
    redis: boolean;
    rag: boolean;
    overall: boolean;
  }> {
    const redisHealth = await this.checkRedisHealth();
    const ragHealth = await this.checkRagHealth();

    return {
      redis: redisHealth,
      rag: ragHealth,
      overall: redisHealth, // Only Redis is critical
    };
  }

  private async checkRedisHealth(): Promise<boolean> {
    try {
      await redisService.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  private async checkRagHealth(): Promise<boolean> {
    try {
      await ragService.ping();
      return true;
    } catch (error) {
      logger.warn('RAG health check failed:', error);
      return false;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down services...');
    try {
      // Check if Redis is connected before trying to close
      const redisHealth = await this.checkRedisHealth();
      if (redisHealth) {
        await redisService.close();
      }

      // RAG service can be closed regardless of Redis state
      await ragService.close();
      
      this.isInitialized = false;
      logger.info('Services shut down successfully');
    } catch (error) {
      // Log but don't throw - we want to exit gracefully
      logger.error('Error during service shutdown:', error);
    }
  }
}

export const serviceManager = ServiceManager.getInstance(); 