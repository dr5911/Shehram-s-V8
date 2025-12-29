import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { Content } from './Content';

@Table({
  tableName: 'analytics',
  timestamps: true,
})
export class Analytics extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => Content)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  contentId!: string;

  @BelongsTo(() => Content)
  content!: Content;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  views!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  likes!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  comments!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  shares!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  clicks!: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 0,
  })
  engagementRate!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  reach!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  impressions!: number;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  averageWatchTime?: number;

  @Column({
    type: DataType.DECIMAL(5, 2),
    defaultValue: 0,
  })
  completionRate?: number;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  date!: Date;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata?: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
