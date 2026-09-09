import {
  ValidationPipe,
  type DynamicModule,
  type INestApplication,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { setupSwagger } from './config/swagger.config.js';

export interface CreateAppOptions {
  extraImports?: NonNullable<DynamicModule['imports']>;
}

/** 本地 HTTP 服务与 Serverless 共用的应用装配逻辑（不含 listen） */
export async function createApp(
  options: CreateAppOptions = {},
): Promise<INestApplication> {
  const app = await NestFactory.create(
    AppModule.register(options.extraImports),
    {
      instrument: ObserveInstrument,
    },
  );

  // 全局路由前缀（必须在 Swagger 初始化之前设置）
  app.setGlobalPrefix('api/v1');

  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger 必须在路由确定后挂载
  setupSwagger(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动剔除前端传过来的多余未定义字段（防注入）
      transform: true, // 自动把 URL query 的字符串 "123" 转为 number 类型
      forbidNonWhitelisted: true, // 遇到未定义字段直接拦截报错
      transformOptions: {
        enableImplicitConversion: true, // 隐式类型转换（配合 DTO 声明）
      },
    }),
  );

  app.use(helmet());
  app.enableCors({
    origin: '*', // 生产环境指定具体前端域名
    credentials: true,
  });

  return app;
}
