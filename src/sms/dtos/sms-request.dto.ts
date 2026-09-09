// src/sms/dtos/sms-request.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, Matches } from 'class-validator';

export enum SmsScene {
  LOGIN = 'login',
  REGISTER = 'register',
  RESET_PASSWORD = 'reset_pwd',
  BIND_PHONE = 'bind_phone',
}

export class SendVerificationCodeDto {
  @ApiProperty({ description: '接收手机号', example: '13800138000' })
  @IsNotEmpty({ message: '手机号不能为空' })
  @Matches(/^1[3-9]\d{9}$/, { message: '手机号码格式不正确' })
  phone: string;

  @ApiProperty({
    description: '业务场景标识',
    enum: SmsScene,
    example: SmsScene.LOGIN,
    required: false,
    default: SmsScene.LOGIN,
  })
  @IsOptional()
  scene?: SmsScene = SmsScene.LOGIN;
}
