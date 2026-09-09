// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '../enums/error-code.enum.js';

export class BusinessException<T = unknown> extends HttpException {
  public readonly businessCode: number;
  public readonly errorData: T | null; // 👈 必须在这里显式声明这个属性
  constructor(
    message: string,
    businessCode: number = ErrorCode.COMMON_ERROR,
    data: T | null = null,
    // 底层 HTTP 状态强制保持 200 OK
    httpStatus: HttpStatus = HttpStatus.OK,
  ) {
    super({ message, code: businessCode, data }, httpStatus);
    this.businessCode = businessCode;
  }
}
