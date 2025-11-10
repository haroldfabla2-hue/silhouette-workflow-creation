import { createClient, RedisClientType } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  database: number;
  retryDelayOnFailover?: number;
  enableOfflineQueue?: boolean;
  maxRetriesPerRequest?: number;
}

export const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'haaspass',
  database: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
};

let client: RedisClientType;

export const getRedisClient = (): RedisClientType => {
  if (!client) {
    client = createClient({
      ...redisConfig,
      socket: {
        ...redisConfig,
        connectTimeout: 5000,
        lazyConnect: true,
      },
    });
    
    // Handle connection events
    client.on('connect', () => {
      console.log('🔗 Redis client connecting...');
    });
    
    client.on('ready', () => {
      console.log('✅ Redis client ready');
    });
    
    client.on('error', (err) => {
      console.error('❌ Redis client error:', err);
    });
    
    client.on('end', () => {
      console.log('🔌 Redis client disconnected');
    });
    
    client.on('reconnecting', () => {
      console.log('🔄 Redis client reconnecting...');
    });
  }
  
  return client;
};

export const setupRedis = async (): Promise<void> => {
  try {
    const redisClient = getRedisClient();
    await redisClient.connect();
    
    // Test the connection
    const pong = await redisClient.ping();
    console.log(`📡 Redis ping: ${pong}`);
    
    // Get Redis info
    const info = await redisClient.info();
    const version = info.split('\n').find(line => line.startsWith('redis_version:'))?.split(':')[1];
    console.log(`🗃️ Redis version: ${version?.trim()}`);
    
    // Test basic operations
    await redisClient.set('silhouette:health_check', 'OK', { EX: 10 });
    const healthCheck = await redisClient.get('silhouette:health_check');
    console.log(`💚 Redis health check: ${healthCheck}`);
    
  } catch (error) {
    console.error('❌ Redis setup failed:', error);
    throw error;
  }
};

// Cache utility functions
export class RedisCache {
  private client: RedisClientType;
  
  constructor() {
    this.client = getRedisClient();
  }
  
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET error for key ${key}:`, error);
      return null;
    }
  }
  
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      const options = ttlSeconds ? { EX: ttlSeconds } : {};
      await this.client.set(key, serialized, options);
      return true;
    } catch (error) {
      console.error(`Redis SET error for key ${key}:`, error);
      return false;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
  
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
  
  async increment(key: string, by: number = 1): Promise<number | null> {
    try {
      return await this.client.incrBy(key, by);
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return null;
    }
  }
  
  async expire(key: string, seconds: number): Promise<boolean> {
    try {
      await this.client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error(`Redis EXPIRE error for key ${key}:`, error);
      return false;
    }
  }
  
  async flushPattern(pattern: string): Promise<boolean> {
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error(`Redis FLUSH PATTERN error for pattern ${pattern}:`, error);
      return false;
    }
  }
}

// Session management
export class RedisSession {
  private client: RedisClientType;
  private prefix: string;
  
  constructor(prefix: string = 'silhouette:session') {
    this.client = getRedisClient();
    this.prefix = prefix;
  }
  
  private getKey(userId: string): string {
    return `${this.prefix}:${userId}`;
  }
  
  async setSession(userId: string, sessionData: any, ttlSeconds: number = 86400): Promise<boolean> {
    try {
      const key = this.getKey(userId);
      const serialized = JSON.stringify(sessionData);
      await this.client.setEx(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      console.error(`Redis SESSION SET error for user ${userId}:`, error);
      return false;
    }
  }
  
  async getSession(userId: string): Promise<any | null> {
    try {
      const key = this.getKey(userId);
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis SESSION GET error for user ${userId}:`, error);
      return null;
    }
  }
  
  async deleteSession(userId: string): Promise<boolean> {
    try {
      const key = this.getKey(userId);
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error(`Redis SESSION DEL error for user ${userId}:`, error);
      return false;
    }
  }
  
  async extendSession(userId: string, additionalSeconds: number): Promise<boolean> {
    try {
      const key = this.getKey(userId);
      await this.client.expire(key, additionalSeconds);
      return true;
    } catch (error) {
      console.error(`Redis SESSION EXTEND error for user ${userId}:`, error);
      return false;
    }
  }
}

// Rate limiting
export class RedisRateLimiter {
  private client: RedisClientType;
  private prefix: string;
  
  constructor(prefix: string = 'silhouette:rate') {
    this.client = getRedisClient();
    this.prefix = prefix;
  }
  
  async checkLimit(
    identifier: string,
    maxRequests: number,
    windowSeconds: number
  ): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    try {
      const key = `${this.prefix}:${identifier}`;
      const now = Math.floor(Date.now() / 1000);
      const window = Math.floor(now / windowSeconds) * windowSeconds;
      const windowKey = `${key}:${window}`;
      
      const current = await this.client.incr(windowKey);
      
      if (current === 1) {
        await this.client.expire(windowKey, windowSeconds);
      }
      
      const resetTime = (window + windowSeconds) * 1000;
      const remaining = Math.max(0, maxRequests - current);
      const allowed = current <= maxRequests;
      
      return { allowed, remaining, resetTime };
    } catch (error) {
      console.error(`Redis RATE LIMIT error for identifier ${identifier}:`, error);
      return { allowed: true, remaining: maxRequests, resetTime: Date.now() + windowSeconds * 1000 };
    }
  }
}

// Real-time collaboration cache
export class RedisCollaboration {
  private client: RedisClientType;
  private prefix: string;
  
  constructor(prefix: string = 'silhouette:collab') {
    this.client = getRedisClient();
    this.prefix = prefix;
  }
  
  private getWorkflowKey(workflowId: string): string {
    return `${this.prefix}:workflow:${workflowId}`;
  }
  
  private getUserKey(workflowId: string, userId: string): string {
    return `${this.prefix}:user:${workflowId}:${userId}`;
  }
  
  async addCollaborator(workflowId: string, userId: string, userData: any): Promise<boolean> {
    try {
      const key = this.getWorkflowKey(workflowId);
      await this.client.hSet(key, userId, JSON.stringify({
        ...userData,
        joined_at: Date.now()
      }));
      await this.client.expire(key, 300); // 5 minutes TTL
      return true;
    } catch (error) {
      console.error(`Redis COLLAB ADD error:`, error);
      return false;
    }
  }
  
  async removeCollaborator(workflowId: string, userId: string): Promise<boolean> {
    try {
      const key = this.getWorkflowKey(workflowId);
      await this.client.hDel(key, userId);
      return true;
    } catch (error) {
      console.error(`Redis COLLAB REMOVE error:`, error);
      return false;
    }
  }
  
  async getCollaborators(workflowId: string): Promise<any[]> {
    try {
      const key = this.getWorkflowKey(workflowId);
      const data = await this.client.hGetAll(key);
      return Object.entries(data).map(([userId, value]) => ({
        userId,
        ...JSON.parse(value)
      }));
    } catch (error) {
      console.error(`Redis COLLAB GET error:`, error);
      return [];
    }
  }
  
  async updateUserCursor(workflowId: string, userId: string, position: any): Promise<boolean> {
    try {
      const key = this.getWorkflowKey(workflowId);
      const userData = await this.client.hGet(key, userId);
      if (userData) {
        const parsed = JSON.parse(userData);
        parsed.cursor_position = position;
        parsed.last_activity = Date.now();
        await this.client.hSet(key, userId, JSON.stringify(parsed));
      }
      return true;
    } catch (error) {
      console.error(`Redis COLLAB CURSOR error:`, error);
      return false;
    }
  }
}

// Health check function
export const checkRedisHealth = async (): Promise<{
  healthy: boolean;
  responseTime: number;
  details: any;
}> => {
  const start = Date.now();
  const client = getRedisClient();
  
  try {
    const pong = await client.ping();
    const responseTime = Date.now() - start;
    
    const info = await client.info();
    const version = info.split('\n').find(line => line.startsWith('redis_version:'))?.split(':')[1];
    
    return {
      healthy: true,
      responseTime,
      details: {
        version: version?.trim(),
        ping: pong,
        memory_usage: info.split('\n').find(line => line.startsWith('used_memory:'))?.split(':')[1],
      },
    };
  } catch (error) {
    return {
      healthy: false,
      responseTime: Date.now() - start,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    };
  }
};

// Cleanup function
export const closeRedis = async (): Promise<void> => {
  if (client) {
    await client.quit();
    console.log('🔒 Redis client closed');
  }
};

// Export instances
export const cache = new RedisCache();
export const sessionManager = new RedisSession();
export const rateLimiter = new RedisRateLimiter();
export const collaborationCache = new RedisCollaboration();