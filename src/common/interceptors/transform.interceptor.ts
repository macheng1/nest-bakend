// src/common/interceptors/transform.interceptor.ts
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { KEEP_KEY } from '../decorators/keep.decorator.js';
import { ErrorCode } from '../enums/error-code.enum.js';
import { ApiResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    // 若标注了 @Keep()，直接放行原生数据
    const keepRaw = this.reflector.getAllAndOverride<boolean>(KEEP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (keepRaw) {
      return next.handle();
    }

    const ctx = context.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const traceId =
      (response.getHeader('x-request-id') as string) ||
      (request.headers['x-request-id'] as string) ||
      '';

    return next.handle().pipe(
      map((data) => ({
        code: ErrorCode.SUCCESS, // 业务成功码（0 或 200）
        message: 'success',
        data: data !== undefined ? data : null,
        timestamp: new Date().toISOString(),
        traceId,
        path: request.url,
      })),
    );
  }
}
