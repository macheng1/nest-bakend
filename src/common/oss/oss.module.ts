// src/common/oss/oss.module.ts
import { Global, Module } from '@nestjs/common';
import { OssService } from './oss.service.js';

@Global()
@Module({
  providers: [OssService],
  exports: [OssService],
})
export class OssModule {}
