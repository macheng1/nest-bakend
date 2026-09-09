// src/config/logger.config.ts
import { randomUUID } from 'crypto';
import { Params } from 'nestjs-pino';

export const loggerConfig: Params = {
  pinoHttp: {
    // 1. 全链路 TraceId：优先取上游网关传来的 x-request-id，没有则自动生成
    genReqId: (req, res) => {
      const existingId = req.headers['x-request-id'] as string;
      const id = existingId || randomUUID();
      // 将 requestId 回写到响应头，方便前端/调用方排查
      res.setHeader('x-request-id', id);
      return id;
    },

    // 2. 日志级别
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

    // 3. 开发环境输出美化，生产环境输出高性能单行 JSON
    transport:
      process.env.NODE_ENV !== 'production'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
              ignore: 'pid,hostname',
            },
          }
        : undefined,

    // 4. 安全脱敏：防止密码与 Token 被写入日志磁盘
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.confirmPassword',
        'req.body.token',
      ],
      censor: '***[REDACTED]***',
    },

    // 5. 格式化日志输出字段
    customProps: (req) => ({
      context: 'HTTP',
    }),
  },
};
