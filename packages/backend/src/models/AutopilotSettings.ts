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
  tableName: 'autopilot_settings',
  timestamps: true,
})
export class AutopilotSettings extends Model {
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
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  autoPostEnabled!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 1,
  })
  postsPerDay!: number;

  @Column({
    type: DataType.ARRAY(DataType.INTEGER),
    defaultValue: [9, 14, 19],
  })
  preferredHours?: number[];

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  useOptimalTiming!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  contentResearchEnabled!: boolean;

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  targetTopics?: string[];

  @Column({
    type: DataType.ARRAY(DataType.STRING),
    defaultValue: [],
  })
  excludedTopics?: string[];

  @Column({
    type: DataType.ENUM('conservative', 'moderate', 'aggressive'),
    defaultValue: 'moderate',
  })
  postingStrategy!: string;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  autoHashtags!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  performancePrediction!: boolean;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 50,
  })
  minPredictedScore!: number;

  @Column({
    type: DataType.JSONB,
    defaultValue: {},
  })
  advancedSettings?: Record<string, any>;

  @CreatedAt
  createdAt!: Date;

  @UpdatedAt
  updatedAt!: Date;
}
