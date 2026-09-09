// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisService } from '../common/redis/redis.service.js';

@ApiTags('健康检查')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redisService: RedisService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: '系统全项健康检查（K8s readiness 探针）' })
  check() {
    return this.health.check([
      // 1. 检查数据库连通性（向 PG 发起轻量 ping ping 探测）
      () => this.db.pingCheck('database', { timeout: 3000 }),
      async () => {
        const pong = await this.redisService.getClient().ping();
        if (pong !== 'PONG') {
          throw new Error('Redis ping response was not PONG');
        }
        return { redis: { status: 'up' } };
      },
      // 2. 检查堆内存占用：不超过 300MB（按需调整）
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),

      // 3. 检查物理常驻内存 (RSS)：不超过 500MB
      () => this.memory.checkRSS('memory_rss', 500 * 1024 * 1024),

      // 4. 检查磁盘存储余量：已使用比例不超过 90%
      () =>
        this.disk.checkStorage('disk_storage', {
          thresholdPercent: 0.9,
          path: '/',
        }),
    ]);
  }

  @Get('liveness')
  @HealthCheck()
  @ApiOperation({ summary: '进程存活探针（K8s liveness 探针）' })
  checkLiveness() {
    // 存活探针只需确认 Node.js 事件循环未假死即可，无需频繁 ping 数据库
    return this.health.check([]);
  }
}
