// src/config/database.config.ts
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// TypeORM 内部用 require('pg') 动态加载驱动，静态引入才能被打包器追踪到
import 'pg';

// Serverless 每个实例各持一份连接池，必须压到最小避免打爆数据库连接数
const isServerless = Boolean(process.env.VERCEL);

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres', // 或 'mysql'
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'core_db',
  // 自动加载被 TypeOrmModule.forFeature([Entity]) 注册的实体
  autoLoadEntities: true,
  // ⚠️ 极其关键：开发环境可设为 true，生产环境必须为 false，避免误删字段甚至删库
  synchronize: process.env.NODE_ENV !== 'production',
  // 日志级别：开发环境打印 query，生产环境仅打印 error
  logging:
    process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
  // 生产连接池配置（根据机器规格调整）
  extra: {
    max: isServerless ? 2 : 20, // 最大连接数
    connectionTimeoutMillis: 5000, // 连接超时时间
    idleTimeoutMillis: 30000, // 空闲连接释放时间
  },
}));
