import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  CreatedAt,
  UpdatedAt,
} from 'sequelize-typescript';
import { FacebookAccount } from './FacebookAccount';
import { Earning } from './Earning';
import { Analytics } from './Analytics';

@Table({
  tableName: 'contents',
  timestamps: true,
})
export class Content extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  contentId!: string;

  @Column({
    type: DataType.ENUM('post', 'video', 'reel', 'story', 'live'),
    allowNull: false,
  })
  contentType!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  title?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  description?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  thumbnailUrl?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  contentUrl?: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isMonetized!: boolean;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  category?: string;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  tags?: string[];

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata?: Record<string, any>;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  publishedAt?: Date;

  @HasMany(() => Earning)
  earnings!: Earning[];

  @HasMany(() => Analytics)
  analytics!: Analytics[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
