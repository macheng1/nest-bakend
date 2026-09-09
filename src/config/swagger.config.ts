// src/config/swagger.config.ts
import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  // 生产环境直接关闭文档，避免接口信息泄露
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const config = new DocumentBuilder()
    .setTitle('Core Service API')
    .setDescription('Enterprise Backend Service API Documentation')
    .setVersion('1.0.0')
    // 注入 JWT 鉴权头支持（页面右上角会出现 Authorize 锁图标）
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: '请输入 JWT Token',
        in: 'header',
      },
      'bearer-token', // 安全策略唯一标识符
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // 挂载到 /docs 路径，并优化前端渲染配置
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 刷新页面时保留填写的 Token
      filter: true, // 开启接口搜索过滤框
      displayRequestDuration: true, // 显示请求耗时
    },
    customSiteTitle: 'API Docs - Core Service',
  });
}
