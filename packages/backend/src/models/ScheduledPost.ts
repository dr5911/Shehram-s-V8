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
import { User } from './User';
import { FacebookAccount } from './FacebookAccount';

@Table({
  tableName: 'scheduled_posts',
  timestamps: true,
})
export class ScheduledPost extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => User)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @ForeignKey(() => FacebookAccount)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  facebookAccountId!: string;

  @BelongsTo(() => FacebookAccount)
  facebookAccount!: FacebookAccount;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  content!: string;

  @Column({
    type: DataType.ENUM('post', 'video', 'reel', 'story'),
    allowNull: false,
  })
  contentType!: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  mediaUrls?: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  hashtags?: string[];

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  scheduledFor!: Date;

  @Column({
    type: DataType.ENUM('pending', 'processing', 'published', 'failed', 'cancelled'),
    defaultValue: 'pending',
  })
  status!: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  publishedContentId?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  errorMessage?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  publishedAt?: Date;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 0,
  })
  retryCount?: number;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  lastRetryAt?: Date;

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
