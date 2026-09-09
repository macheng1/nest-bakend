// src/file/file.controller.ts
import {
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { ErrorCode } from '../common/enums/error-code.enum.js';
import { BusinessException } from '../common/exceptions/business.exception.js';
import { OssService } from '../common/oss/oss.service.js';
import { validateUploadedFile } from '../common/utils/file-upload.utils.js';

@ApiTags('文件存储管理')
@Controller('files')
export class FileController {
  private readonly maxFileSizeMb: number;
  private readonly maxCount: number;
  private readonly allowedTypes: string[];
  private readonly signedUrlExpires: number;

  constructor(
    private readonly ossService: OssService,
    private readonly configService: ConfigService,
  ) {
    this.maxFileSizeMb = this.configService.get<number>(
      'oss.maxFileSizeMb',
      10,
    );
    this.maxCount = this.configService.get<number>('oss.maxCount', 5);
    this.allowedTypes = this.configService.get<string[]>(
      'oss.allowedTypes',
      [],
    );
    this.signedUrlExpires = this.configService.get<number>(
      'oss.signedUrlExpires',
      3600,
    );
  }

  // ==========================================
  // 1. 单文件直传 OSS
  // ==========================================
  @Post('upload')
  @ApiOperation({ summary: '单文件上传到云存储' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'module',
    required: false,
    description: '业务模块目录 (如: avatar / order / goods)，默认 common',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('module') module = 'common',
  ) {
    if (!file) {
      throw new BusinessException(
        '请选择要上传的文件',
        ErrorCode.PARAM_INVALID,
      );
    }

    // 动态规则校验（MB 大小、类型）
    validateUploadedFile(file, this.maxFileSizeMb, this.allowedTypes);

    const uploadResult = await this.ossService.uploadFile(file, module);

    return {
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
      ...uploadResult,
    };
  }

  // ==========================================
  // 2. 多文件批量直传 OSS
  // ==========================================
  @Post('upload/batch')
  @ApiOperation({ summary: '批量上传文件到云存储' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'module',
    required: false,
    description: '业务模块目录，默认 common',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 20, { storage: memoryStorage() }))
  async uploadBatchFiles(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Query('module') module = 'common',
  ) {
    if (!files || files.length === 0) {
      throw new BusinessException(
        '请至少选择一个文件上传',
        ErrorCode.PARAM_INVALID,
      );
    }

    // 校验批量上传数量限制
    if (files.length > this.maxCount) {
      throw new BusinessException(
        `一次最多允许批量上传 ${this.maxCount} 个文件`,
        ErrorCode.PARAM_INVALID,
      );
    }

    // 遍历执行规则校验
    for (const file of files) {
      validateUploadedFile(file, this.maxFileSizeMb, this.allowedTypes);
    }

    // 并发上传至 OSS
    return Promise.all(
      files.map(async (file) => {
        const result = await this.ossService.uploadFile(file, module);
        return {
          originalName: Buffer.from(file.originalname, 'latin1').toString(
            'utf8',
          ),
          ...result,
        };
      }),
    );
  }

  // ==========================================
  // 3. 获取私有文件的带时效临时访问链接
  // ==========================================
  @Get('signed-url')
  @ApiOperation({ summary: '获取私有文件的带时效临时访问链接' })
  @ApiQuery({ name: 'key', description: 'OSS 内部的 objectKey' })
  @ApiQuery({
    name: 'expires',
    required: false,
    description: '链接有效时长(秒)，默认读取系统配置',
  })
  async getDownloadUrl(
    @Query('key') key: string,
    @Query('expires') customExpires?: number,
  ) {
    if (!key) {
      throw new BusinessException(
        'objectKey 不能为空',
        ErrorCode.PARAM_INVALID,
      );
    }

    const expires = customExpires
      ? Number(customExpires)
      : this.signedUrlExpires;
    const signedUrl = await this.ossService.getSignedUrl(key, expires);

    return { signedUrl, expires };
  }
}
