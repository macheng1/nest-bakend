// src/config/sms.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('sms', () => ({
  endpoint: process.env.SMS_ENDPOINT || 'dysmsapi.aliyuncs.com',
  accessKeyId: process.env.SMS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.SMS_ACCESS_KEY_SECRET || '',
  signName: process.env.SMS_SIGN_NAME || '',
  templateCode: process.env.SMS_TEMPLATE_CODE || '',
  codeExpires: parseInt(process.env.SMS_CODE_EXPIRES || '300', 10),
  resendInterval: parseInt(process.env.SMS_RESEND_INTERVAL || '60', 10),
}));
