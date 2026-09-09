// src/common/sms/sms.service.ts
import Dysmsapi20170525, * as $Dysmsapi20170525 from '@alicloud/dysmsapi20170525';
import * as $OpenApi from '@alicloud/openapi-client';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ErrorCode } from '../enums/error-code.enum.js';
import { BusinessException } from '../exceptions/business.exception.js';
import { RedisService } from '../redis/redis.service.js';

@Injectable()
export class SmsService implements OnModuleInit {
  private readonly logger = new Logger(SmsService.name);
  private client: Dysmsapi20170525.default;
  private signName: string;
  private templateCode: string;
  private codeExpires: number;
  private resendInterval: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  // src/common/sms/sms.service.ts
  onModuleInit() {
    const endpoint = this.configService
      .get<string>('sms.endpoint', 'dysmsapi.aliyuncs.com')
      ?.trim();
    const accessKeyId = this.configService
      .get<string>('sms.accessKeyId')
      ?.trim();
    const accessKeySecret = this.configService
      .get<string>('sms.accessKeySecret')
      ?.trim();
    this.signName = this.configService.get<string>('sms.signName', '')?.trim();
    this.templateCode = this.configService
      .get<string>('sms.templateCode', '')
      ?.trim();
    this.codeExpires = this.configService.get<number>('sms.codeExpires', 300);
    this.resendInterval = this.configService.get<number>(
      'sms.resendInterval',
      60,
    );

    if (!accessKeyId || !accessKeySecret) {
      this.logger.warn('⚠️ 短信服务凭据未完整配置，短信发送功能暂不可用');
      return;
    }

    try {
      const config = new $OpenApi.Config({
        accessKeyId,
        accessKeySecret,
        endpoint, // 👈 优先使用配置的 endpoint 直连
      });

      const ClientConstructor =
        (Dysmsapi20170525 as any).default || Dysmsapi20170525;
      this.client = new ClientConstructor(config);
      this.logger.log(`✅ 阿里云短信客户端初始化完成 [Endpoint: ${endpoint}]`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`❌ 短信客户端初始化失败: ${err.message}`, err.stack);
    }
  }

  /**
   * 生成 4 或 6 位随机数字验证码
   */
  private generateCode(length = 6): string {
    return Math.random()
      .toString()
      .slice(2, 2 + length);
  }

  // src/common/sms/sms.service.ts 中的关键方法更新
  /**
   * 发送业务验证码短信
   * @param phone 手机号
   * @param scene 场景，如 login / register
   */
  async sendVerificationCode(phone: string, scene = 'login'): Promise<void> {
    const redisClient = this.redisService.getClient();
    const lockKey = `sms:lock:${scene}:${phone}`;
    const codeKey = `sms:code:${scene}:${phone}`;

    // 1. 防刷限制：60 秒内同一场景只能发 1 次
    const isLocked = await redisClient.get(lockKey);
    if (isLocked) {
      throw new BusinessException(
        '验证码发送过于频繁，请稍后再试',
        ErrorCode.COMMON_ERROR,
      );
    }

    // 2. 生成 6 位随机验证码
    const code = this.generateCode(6);

    // 3. 开发环境无 Key 时免发
    if (process.env.NODE_ENV !== 'production' && !this.client) {
      this.logger.debug(
        `[DEV ONLY][${scene.toUpperCase()}] 手机号 ${phone} 的验证码是: ${code}`,
      );
      await redisClient.set(codeKey, code, 'EX', this.codeExpires);
      await redisClient.set(lockKey, '1', 'EX', this.resendInterval);
      return;
    }

    if (!this.client) {
      throw new BusinessException(
        '短信服务未配置，请联系管理员',
        ErrorCode.COMMON_ERROR,
      );
    }

    // 4. 调用阿里云 OpenAPI
    try {
      const sendSmsRequest = new $Dysmsapi20170525.SendSmsRequest({
        phoneNumbers: phone,
        signName: this.signName,
        templateCode: this.templateCode,
        templateParam: JSON.stringify({ code }),
      });

      const response = await this.client.sendSms(sendSmsRequest);

      if (response?.body?.code !== 'OK') {
        this.logger.error(
          `阿里云短信发送失败: ${response?.body?.code} - ${response?.body?.message}`,
        );
        throw new BusinessException(
          `短信发送失败: ${response?.body?.message}`,
          ErrorCode.COMMON_ERROR,
        );
      }

      // 5. 写入 Redis
      await redisClient.set(codeKey, code, 'EX', this.codeExpires);
      await redisClient.set(lockKey, '1', 'EX', this.resendInterval);

      this.logger.log(`[${scene.toUpperCase()}] 短信验证码已发送至 ${phone}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`短信发送异常: ${err.message}`, err.stack);
      throw new BusinessException(
        err.message || '短信发送失败',
        ErrorCode.COMMON_ERROR,
      );
    }
  }
  /**
   * 校验用户输入的验证码
   */
  async verifyCode(phone: string, inputCode: string): Promise<boolean> {
    const redisClient = this.redisService.getClient();
    const codeKey = `sms:code:${phone}`;

    const savedCode = await redisClient.get(codeKey);
    if (!savedCode) {
      throw new BusinessException(
        '验证码已过期或未获取，请重新获取',
        ErrorCode.PARAM_INVALID,
      );
    }

    if (savedCode !== inputCode.trim()) {
      throw new BusinessException(
        '验证码错误，请重新输入',
        ErrorCode.PARAM_INVALID,
      );
    }

    // 校验成功即刻销毁，防二次重放
    await redisClient.del(codeKey);
    return true;
  }
}
