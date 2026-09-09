import { Module, type DynamicModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createObserveModule } from '@nestjs/observe';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HttpClientModule } from './common/http/http-client.module.js';
import { OssModule } from './common/oss/oss.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { SmsModule } from './common/sms/sms.module.js';
import databaseConfig from './config/database.config.js';
import ossConfig from './config/oss.config.js';
import redisConfig from './config/redis.config.js';
import smsConfig from './config/sms.config.js';
import { FileModule } from './file/file.module.js';
import { HealthModule } from './health/health.module.js';
import { SmsFeatureModule } from './sms/sms.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();
const env = process.env.NODE_ENV || 'development';

@Module({
  imports: [
    // 监控诊断模块（敏感密钥通过环境变量注入）
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY || 'default_key',
      appSecret: process.env.OBSERVE_APP_SECRET || 'default_secret',
      serviceId: process.env.APP_NAME || 'base-temple-local',
    }),

    // 全局环境配置模块
    ConfigModule.forRoot({
      isGlobal: true, // 全局可用
      load: [databaseConfig, redisConfig, ossConfig, smsConfig],
      envFilePath: [`.env.${env}`, '.env'],
      cache: true,
    }),

    // 异步加载 TypeORM 配置
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.get('database')!, // 👈 现在能正确拿到 database.config.ts 导出的配置对象了
    }),
    HealthModule,
    RedisModule,
    HttpClientModule,
    FileModule,
    OssModule,
    SmsModule,
    SmsFeatureModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  /** extraImports 用于注入仅常驻进程可用的模块（如 CJS-only 的 nestjs-pino） */
  static register(
    extraImports: NonNullable<DynamicModule['imports']> = [],
  ): DynamicModule {
    return { module: AppModule, imports: extraImports };
  }
}
