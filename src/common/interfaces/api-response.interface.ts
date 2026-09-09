// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data: T | null;
  timestamp: string;
  traceId?: string;
  path?: string;
}
