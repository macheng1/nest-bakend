// src/sms/sms.module.ts
import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller.js';

@Module({
  controllers: [SmsController],
})
export class SmsFeatureModule {}
