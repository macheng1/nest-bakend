import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApp } from './app.factory.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

// 复用同一个 Lambda 实例上的 Nest 应用，避免每次冷调用都重新初始化
let bootstrapped: Promise<NodeHandler> | undefined;

async function init(): Promise<NodeHandler> {
  const app = await createApp();
  await app.init(); // Serverless 下不监听端口，只初始化容器与路由
  return app.getHttpAdapter().getInstance() as NodeHandler;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  bootstrapped ??= init();
  const expressApp = await bootstrapped;
  expressApp(req, res);
}
