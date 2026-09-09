// src/common/filters/all-exceptions.filter.ts
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorCode } from '../enums/error-code.enum.js';
import { BusinessException } from '../exceptions/business.exception.js';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let httpStatus = HttpStatus.OK;
    let businessCode = ErrorCode.COMMON_ERROR;
    let message = '系统内部错误，请稍后重试';
    let responseData: any = null; // 👈 用于承接错误时的明细数据

    // 1. 自定义业务异常（提取业务 code 和携带的数据）
    if (exception instanceof BusinessException) {
      httpStatus = HttpStatus.OK;
      businessCode = exception.businessCode;
      message = exception.message;
      responseData = exception.errorData; // 👈 拿到传递过来的错误数据
    }
    // 2. NestJS 内置 HTTP 异常
    else if (exception instanceof HttpException) {
      httpStatus = HttpStatus.OK;
      businessCode = ErrorCode.PARAM_INVALID;
      const res = exception.getResponse() as any;

      if (typeof res === 'object' && res !== null) {
        message = Array.isArray(res.message)
          ? res.message.join('; ')
          : res.message || exception.message;
        // 如果是 class-validator 报错，也可以直接把详细错误数组挂在 data 上
        if (Array.isArray(res.message)) {
          responseData = res.message;
        }
      } else {
        message = exception.message;
      }
    }
    // 3. 系统意外错误
    else if (exception instanceof Error) {
      httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
      businessCode = 500;
      if (process.env.NODE_ENV !== 'production') {
        message = exception.message;
      }
    }

    const traceId =
      (response.getHeader('x-request-id') as string) ||
      (request.headers['x-request-id'] as string) ||
      '';

    const responseBody: ApiResponse = {
      code: businessCode,
      message,
      data: responseData, // 👈 报错时也能输出具体错误明细
      timestamp: new Date().toISOString(),
      traceId,
      path: request.url,
    };

    if (httpStatus >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - Code:${businessCode} - ${message}`,
      );
    }

    response.status(httpStatus).json(responseBody);
  }
}
