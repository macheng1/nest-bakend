// src/common/utils/file-upload.utils.ts
import { ErrorCode } from '../enums/error-code.enum.js';
import { BusinessException } from '../exceptions/business.exception.js';

/**
 * 校验上传的单个文件是否合规
 * @param file Multer 文件对象
 * @param maxSizeMb 限制大小（单位：MB）
 * @param allowedTypes 允许的 MIME 格式白名单
 */
export function validateUploadedFile(
  file: Express.Multer.File,
  maxSizeMb: number,
  allowedTypes: string[],
) {
  if (!file) {
    throw new BusinessException('请上传有效的文件', ErrorCode.PARAM_INVALID);
  }

  const maxBytes = maxSizeMb * 1024 * 1024;

  // 1. 校验文件大小
  if (file.size > maxBytes) {
    throw new BusinessException(
      `文件 [${file.originalname}] 超出大小限制，单文件最大允许 ${maxSizeMb}MB`,
      ErrorCode.PARAM_INVALID,
    );
  }

  // 2. 校验文件格式白名单
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.mimetype)) {
    throw new BusinessException(
      `文件 [${file.originalname}] 格式不受支持 (${file.mimetype})`,
      ErrorCode.PARAM_INVALID,
    );
  }
}
