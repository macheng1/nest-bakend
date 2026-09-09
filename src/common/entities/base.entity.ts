// src/common/entities/base.entity.ts
import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  @DeleteDateColumn({
    name: 'deleted_at',
    select: false,
    comment: '软删除时间',
  })
  deletedAt: Date; // 软删除标识，查询时会自动过滤被软删除的数据
}
