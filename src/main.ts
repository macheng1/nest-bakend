import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule, ObserveInstrument } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';
import { setupSwagger } from './config/swagger.config.js';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
    bufferLogs: true,
  });

  const port = Number(process.env.PORT) || 3000;
  const appName = process.env.APP_NAME ?? 'App';

  // 1. 设置全局路由前缀（必须在 Swagger 初始化之前设置）
  app.setGlobalPrefix('api/v1');

  // 2. 生产必须：开启优雅停机信号监听
  app.enableShutdownHooks();
  // 1. 全局成功出参包装
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new TransformInterceptor(reflector));

  // 2. 全局统一异常捕获
  app.useGlobalFilters(new AllExceptionsFilter());
  // 3. 初始化 Swagger（必须在路由确定后、listen 之前挂载）
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
  // 4. 最后启动 HTTP 端口监听
  await app.listen(port);

  console.log(`🚀 [${appName}] 运行在: http://localhost:${port}`);
  console.log(`📑 [${appName}] API 文档: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('❌ 应用启动失败:', err);
  process.exit(1);
});
