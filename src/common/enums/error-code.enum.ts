// src/common/enums/error-code.enum.ts
export enum ErrorCode {
  SUCCESS = 200, // 或 200
  COMMON_ERROR = 10000, // 通用业务错误
  DATA_ALREADY_EXISTS = 10001, // 数据重复 / 记录已存在
  RECORD_NOT_FOUND = 10002, // 数据不存在
  PARAM_INVALID = 10003, // 参数不合法
  UNAUTHORIZED = 40001, // 登录过期/无权限
  INTERNAL_ERROR = 500,
}
