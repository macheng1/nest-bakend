// src/common/oss/oss.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';
import { randomUUID } from 'crypto';
import { extname } from 'path';
import { ErrorCode } from '../enums/error-code.enum.js';
import { BusinessException } from '../exceptions/business.exception.js';
@Injectable()
export class OssService implements OnModuleInit {
  private readonly logger = new Logger(OssService.name);
  private client: OSS;
  private customDomain: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const ossConfig = this.configService.get('oss');
    console.log('====== OSS CONFIG CHECK ======', ossConfig);
    const region = this.configService.get<string>('oss.region');
    const endpoint = this.configService.get<string>('oss.endpoint')?.trim();
    const accessKeyId = this.configService.get<string>('oss.accessKeyId');
    const accessKeySecret = this.configService.get<string>(
      'oss.accessKeySecret',
    );

    const bucket = this.configService.get<string>('oss.bucket');
    this.customDomain = this.configService.get<string>('oss.customDomain', '');

    if (!accessKeyId || !accessKeySecret || !bucket || !endpoint) {
      this.logger.warn('OSS 凭据未完整配置，文件上传可能无法正常工作');
      return;
    }

    this.client = new OSS({
      region,
      endpoint,
      accessKeyId,
      accessKeySecret,
      bucket,
      secure: true, // 开启 HTTPS
    });
  }

  /**
   * 生成规范化存储路径
   * 格式: {env}/{module}/{YYYY}/{MM}/{DD}/{timestamp}-{uuid}.{ext}
   */
  private generateObjectKey(
    originalFilename: string,
    module = 'common',
  ): string {
    const env = process.env.NODE_ENV || 'development';
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    const ext = extname(originalFilename).toLowerCase();
    const uniqueName = `${Date.now()}-${randomUUID()}${ext}`;

    return `${env}/${module}/${year}/${month}/${day}/${uniqueName}`;
  }

  /**
   * 上传文件 Buffer 到 OSS
   */
  async uploadFile(
    file: Express.Multer.File,
    module = 'common',
  ): Promise<{ objectKey: string; url: string; size: number }> {
    try {
      const objectKey = this.generateObjectKey(file.originalname, module);

      // 上传二进制 Buffer
      const result = await this.client.put(objectKey, file.buffer, {
        headers: {
          'Content-Type': file.mimetype,
        },
      });

      // 优先拼装自定义 CDN 域名，没有则走 OSS 默认 url
      const fileUrl = this.customDomain
        ? `${this.customDomain.replace(/\/$/, '')}/${objectKey}`
        : result.url;

      return {
        objectKey,
        url: fileUrl,
        size: file.size,
      };
    } catch (error) {
      const err = error as Error;
      console.error('------- OSS UPLOAD ERROR DETAIL -------');
      console.error(error);
      console.error('---------------------------------------');
      this.logger.error(`OSS 上传失败: ${err.message}`, err.stack);
      throw new BusinessException(
        '文件上传到云存储失败',
        ErrorCode.COMMON_ERROR,
      );
    }
  }

  /**
   * 生成私有文件的临时带时效下载/预览链接 (默认读取传入的秒数)
   */
  async getSignedUrl(
    objectKey: string,
    expiresSeconds = 3600,
  ): Promise<string> {
    try {
      return this.client.signatureUrl(objectKey, {
        expires: expiresSeconds,
      });
    } catch (error) {
      const err = error as Error;
      this.logger.error(`生成 OSS 签名链接失败: ${err.message}`, err.stack);
      throw new BusinessException(
        '获取文件访问链接失败',
        ErrorCode.COMMON_ERROR,
      );
    }
  }

  /**
   * 删除 OSS 上的文件
   */
  async deleteFile(objectKey: string): Promise<void> {
    try {
      await this.client.delete(objectKey);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`删除 OSS 文件失败: ${err.message}`, err.stack);
    }
  }
}
