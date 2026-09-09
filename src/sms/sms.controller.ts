// src/sms/sms.controller.ts
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SmsService } from '../common/sms/sms.service.js';
import { SendVerificationCodeDto } from './dtos/sms-request.dto.js';

@ApiTags('短信服务')
@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '独立接口：发送短信验证码' })
  async sendCode(@Body() dto: SendVerificationCodeDto) {
    const scene = dto.scene || 'login';
    await this.smsService.sendVerificationCode(dto.phone, scene);

    return {
      phone: dto.phone,
      scene,
      message: '验证码已发送，请注意查收',
    };
  }
}
