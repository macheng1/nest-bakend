// src/common/redis/redis.service.ts
import { Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants.js';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly client: Redis) {}

  // 获取原生 ioredis 客户端（备用，用于复杂管道/事务）
  getClient(): Redis {
    return this.client;
  }

  // 1. 设置缓存（支持泛型对象，自动 JSON 序列化；ttlSeconds 可选）
  async set<T>(
    key: string,
    value: T,
    ttlSeconds?: number,
  ): Promise<'OK' | null> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds && ttlSeconds > 0) {
      return this.client.set(key, serialized, 'EX', ttlSeconds);
    }
    return this.client.set(key, serialized);
  }

  // 2. 获取缓存（自动 JSON 反序列化）
  async get<T>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  // 3. 删除指定 Key（支持多个）
  async del(...keys: string[]): Promise<number> {
    return this.client.del(...keys);
  }

  // 4. 判断 Key 是否存在
  async exists(key: string): Promise<boolean> {
    const count = await this.client.exists(key);
    return count === 1;
  }

  // 5. 分布式锁（基于 SET NX PX 实现）
  async acquireLock(
    lockKey: string,
    lockValue: string,
    expireMs = 5000,
  ): Promise<boolean> {
    const result = await this.client.set(
      lockKey,
      lockValue,
      'PX',
      expireMs,
      'NX',
    );
    return result === 'OK';
  }

  // 6. 安全释放分布式锁（利用 Lua 脚本保证原子核验后删除）
  async releaseLock(lockKey: string, lockValue: string): Promise<boolean> {
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.client.eval(luaScript, 1, lockKey, lockValue);
    return result === 1;
  }

  // 配合 enableShutdownHooks 平滑停机
  async onModuleDestroy() {
    this.logger.log('正在安全断开 Redis 连接...');
    await this.client.quit();
    this.logger.log('Redis 连接已安全断开');
  }
}
