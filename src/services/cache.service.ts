import { RedisCache } from '@langchain/community/caches/ioredis';
import { BaseCache } from '@langchain/core/caches';
import { Redis } from 'ioredis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class CacheService {
  private static instance: CacheService;
  private cache: BaseCache;

  private constructor() {
    const redisClient = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    });

    this.cache = new RedisCache(redisClient, {
      ttl: 3600, // Cache entries expire after 1 hour
    });

    redisClient.on('error', (error) => {
      logger.error('Redis cache error:', error);
    });

    redisClient.on('connect', () => {
      logger.info('Redis cache connected');
    });
  }

  static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  getCache(): BaseCache {
    return this.cache;
  }
}

export const cacheService = CacheService.getInstance(); 