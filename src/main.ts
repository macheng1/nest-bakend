import { createApp } from './app.factory.js';

async function bootstrap() {
  const app = await createApp();

  const port = Number(process.env.PORT) || 3000;
  const appName = process.env.APP_NAME ?? 'App';

  // 长驻进程才需要优雅停机（Serverless 环境不适用）
  app.enableShutdownHooks();

  await app.listen(port);

  console.log(`🚀 [${appName}] 运行在: http://localhost:${port}`);
  console.log(`📑 [${appName}] API 文档: http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  console.error('❌ 应用启动失败:', err);
  process.exit(1);
});
