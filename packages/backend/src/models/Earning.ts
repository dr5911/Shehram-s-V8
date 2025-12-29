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
import { FacebookAccount } from './FacebookAccount';
import { Content } from './Content';

@Table({
  tableName: 'earnings',
  timestamps: true,
})
export class Earning extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => FacebookAccount)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  facebookAccountId!: string;

  @BelongsTo(() => FacebookAccount)
  facebookAccount!: FacebookAccount;

  @ForeignKey(() => Content)
  @Column({
    type: DataType.UUID,
    allowNull: true,
  })
  contentId?: string;

  @BelongsTo(() => Content)
  content?: Content;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  })
  amount!: number;

  @Column({
    type: DataType.STRING(3),
    allowNull: false,
    defaultValue: 'USD',
  })
  currency!: string;

  @Column({
    type: DataType.ENUM('ad_revenue', 'fan_subscription', 'stars', 'bonus', 'other'),
    allowNull: false,
  })
  earningType!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  earningDate!: Date;

  @Column({
    type: DataType.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'completed',
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  transactionId?: string;

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
