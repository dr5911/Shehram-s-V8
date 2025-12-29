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
import { User } from './User';
import { Content } from './Content';
import { Earning } from './Earning';

@Table({
  tableName: 'facebook_accounts',
  timestamps: true,
})
export class FacebookAccount extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
    unique: true,
  })
  facebookId!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: false,
  })
  accessToken!: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  refreshToken?: string;

  @Column({
    type: DataType.DATE,
    allowNull: true,
  })
  tokenExpiry?: Date;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  pageId?: string;

  @Column({
    type: DataType.STRING,
    allowNull: true,
  })
  pageName?: string;

  @Column({
    type: DataType.TEXT,
    allowNull: true,
  })
  pageAccessToken?: string;

  @Column({
    type: DataType.JSONB,
    allowNull: true,
  })
  permissions?: string[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  monetizationEnabled!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive!: boolean;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  metadata?: Record<string, any>;

  @HasMany(() => Content)
  contents!: Content[];

  @HasMany(() => Earning)
  earnings!: Earning[];

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
