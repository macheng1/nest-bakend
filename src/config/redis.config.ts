// src/config/redis.config.ts
import { registerAs } from '@nestjs/config';
import { RedisOptions } from 'ioredis';

export default registerAs('redis', (): RedisOptions => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  // 自动重连机制
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
  maxRetriesPerRequest: 3,
}));
