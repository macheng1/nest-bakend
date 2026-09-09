// src/common/decorators/keep.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const KEEP_KEY = 'custom:keep_raw_response';
export const Keep = () => SetMetadata(KEEP_KEY, true);
