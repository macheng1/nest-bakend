// src/config/oss.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('oss', () => {
  const maxMb = parseFloat(process.env.UPLOAD_MAX_FILE_SIZE_MB || '10');

  return {
    region: process.env.OSS_REGION || 'oss-cn-hangzhou',
    endpoint: process.env.OSS_ENDPOINT || undefined,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || '',

    bucket: process.env.OSS_BUCKET || '',
    customDomain: process.env.OSS_CUSTOM_DOMAIN || '',

    // 常用配置项
    maxFileSizeMb: maxMb,
    maxCount: parseInt(process.env.UPLOAD_MAX_COUNT || '5', 10),
    allowedTypes: (
      process.env.UPLOAD_ALLOWED_TYPES ||
      'image/jpeg,image/png,image/webp,application/pdf'
    ).split(','),
    signedUrlExpires: parseInt(
      process.env.OSS_SIGNED_URL_EXPIRES || '3600',
      10,
    ),
  };
});
