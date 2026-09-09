// src/common/sms/sms.module.ts
import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service.js';

@Global()
@Module({
  providers: [SmsService],
  exports: [SmsService],
})
export class SmsModule {}
