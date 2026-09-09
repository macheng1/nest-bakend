// src/file/file.module.ts
import { Module } from '@nestjs/common';
import { FileController } from './file.controller.js';

@Module({
  controllers: [FileController],
  providers: [],
})
export class FileModule {}
