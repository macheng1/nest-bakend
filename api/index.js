// Vercel Serverless 入口：直接复用 tsc 构建产物，保证装饰器元数据完整
export { default } from '../dist/serverless.js';
