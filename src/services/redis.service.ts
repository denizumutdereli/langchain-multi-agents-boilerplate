import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class RedisService {
  private client;
  private isConnected = false;

  constructor() {
    this.client = createClient({
      url: `redis://${config.redis.host}:${config.redis.port}`,
      password: config.redis.password,
    });

    this.client.on('error', (error) => {
      this.isConnected = false;
      logger.error('Redis client error:', error);
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      logger.info('Redis client connected');
    });

    this.client.on('reconnecting', () => {
      logger.warn('Redis client reconnecting...');
    });

    this.client.on('end', () => {
      this.isConnected = false;
      logger.info('Redis client connection closed');
    });
  }

  async initialize() {
    try {
      await this.client.connect();
      logger.info('Redis service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Redis service:', error);
      throw error;
    }
  }

  async ping(): Promise<boolean> {
    try {
      const response = await this.client.ping();
      return response === 'PONG';
    } catch (error) {
      logger.error('Redis ping failed:', error);
      return false;
    }
  }

  async saveChatHistory(messages: any[], title: string): Promise<string> {
    if (!this.isConnected) {
      throw new Error('Redis service is not connected');
    }

    try {
      const chatId = uuidv4();
      const chatData = {
        id: chatId,
        title,
        messages,
        createdAt: new Date().toISOString(),
      };

      await this.client.set(`chat:${chatId}`, JSON.stringify(chatData));
      logger.debug(`Chat history saved with ID: ${chatId}`);
      return chatId;
    } catch (error) {
      logger.error('Failed to save chat history:', error);
      throw error;
    }
  }

  async getChatHistory(chatId: string): Promise<any | null> {
    if (!this.isConnected) {
      throw new Error('Redis service is not connected');
    }

    try {
      const chatData = await this.client.get(`chat:${chatId}`);
      if (!chatData) {
        logger.debug(`No chat history found for ID: ${chatId}`);
        return null;
      }
      return JSON.parse(chatData);
    } catch (error) {
      logger.error('Failed to get chat history:', error);
      throw error;
    }
  }

  async saveVector(key: string, vector: number[]): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Redis service is not connected');
    }

    try {
      await this.client.set(`vector:${key}`, JSON.stringify(vector));
      logger.debug(`Vector saved with key: ${key}`);
    } catch (error) {
      logger.error('Failed to save vector:', error);
      throw error;
    }
  }

  async getVector(key: string): Promise<number[] | null> {
    if (!this.isConnected) {
      throw new Error('Redis service is not connected');
    }

    try {
      const vector = await this.client.get(`vector:${key}`);
      if (!vector) {
        logger.debug(`No vector found for key: ${key}`);
        return null;
      }
      return JSON.parse(vector);
    } catch (error) {
      logger.error('Failed to get vector:', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
        logger.info('Redis service closed successfully');
      }
    } catch (error) {
      logger.error('Failed to close Redis service:', error);
      throw error;
    }
  }
}

export const redisService = new RedisService(); 