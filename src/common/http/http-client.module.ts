// src/common/http/http-client.module.ts
import { HttpModule } from '@nestjs/axios';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClientService } from './http-client.service.js';

@Global() // 👈 全局可用，业务模块无需重复 import
@Module({
  imports: [
    HttpModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        timeout: configService.get<number>('http.timeout', 8000),
        maxRedirects: configService.get<number>('http.maxRedirects', 5),
        headers: {
          'Content-Type': 'application/json',
        },
      }),
    }),
  ],
  providers: [HttpClientService],
  exports: [HttpClientService],
})
export class HttpClientModule {}
