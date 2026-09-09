// src/common/http/http-client.service.ts
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { ErrorCode } from '../enums/error-code.enum.js';
import { BusinessException } from '../exceptions/business.exception.js';

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * 核心请求分发器
   * 自动打点、耗时统计、TraceId 透传、异常收敛
   */
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const startTime = Date.now();
    const url = config.url || '';
    const method = (config.method || 'GET').toUpperCase();

    try {
      // 触发请求
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request<T>(config),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `[HTTP Outgoing] ${method} ${url} - Status: ${response.status} - ${duration}ms`,
      );

      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      const axiosError = error as AxiosError;

      this.logger.error(
        `[HTTP Outgoing Error] ${method} ${url} - ${duration}ms - Message: ${axiosError.message}`,
        axiosError.response?.data
          ? JSON.stringify(axiosError.response.data)
          : undefined,
      );

      // 转换为统一业务异常，避免 Axios 原生报错外泄给前端
      throw new BusinessException(
        `调用下游服务异常: ${axiosError.message}`,
        ErrorCode.COMMON_ERROR,
        {
          targetUrl: url,
          status: axiosError.response?.status || 500,
          response: axiosError.response?.data || null,
        },
      );
    }
  }

  // GET 语法糖
  async get<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url, params });
  }

  // POST 语法糖
  async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  // PUT 语法糖
  async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  // DELETE 语法糖
  async delete<T = any>(
    url: string,
    params?: any,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url, params });
  }
}
