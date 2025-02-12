import { BaseEntity } from '../../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { CryptocurrencyToken } from '../../../blockchain-core/entities/cryptocurrency-token.entity';
import { Oracle } from '../oracle.entity';
import { MarketMakerFactory } from '../../../prediction-market-contracts/entities/market-maker-factory.entity';
import { Chain } from '../../../blockchain-core/entities/chain.entity';
import { MarketCategory } from '../market-category.entity';
import { User } from '../../../user/entities/user.entity';
import { PredictionMarketTypesEnum } from '../../../prediction-market-contracts/enums/market-types.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('base_prediction_market')
export class BasePredictionMarket extends BaseEntity {
  // Also could be used for holding reserved markets data.
  @ApiProperty({
    type: 'string',
    example: PredictionMarketTypesEnum.LMSR.toString(),
    default: PredictionMarketTypesEnum.LMSR.toString(),
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: PredictionMarketTypesEnum.LMSR.toString(),
    enum: PredictionMarketTypesEnum,
    enumName: 'PredictionMarketTypesEnum',
  })
  type: string;

  @ApiProperty({ type: 'number' })
  @Column({
    name: 'creator_id',
    type: 'integer',
    nullable: false,
  })
  creatorId: number;

  @ApiProperty({ type: User })
  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @ApiProperty({ type: 'number', default: 0, example: 0 })
  @Column({ name: 'oracle_id' })
  oracleId: number;

  @ApiProperty({ type: Oracle })
  @ManyToOne(() => Oracle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'oracle_id' })
  oracle: Oracle;

  @ApiProperty({ type: 'number', default: 1337, example: 1337 })
  @Column({ name: 'chain_id' })
  chainId: number;

  @ApiProperty({ type: Chain })
  @ManyToOne(() => Chain, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @ApiProperty({ type: 'number' })
  @Column({ name: 'category_id', nullable: false })
  categoryId: number;

  @ManyToOne(() => MarketCategory)
  @JoinColumn({ name: 'category_id' })
  category: MarketCategory;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 1024 })
  question: string;

  @ApiPropertyOptional({
    type: 'string?',
    default: null,
    description: 'A short name or nickname for the market. [Optional]',
    nullable: true,
  })
  @Column({ name: 'subject', nullable: true, default: null })
  subject?: string; // This is actually a short name for the market, useful when listing markets to prevent the list being too wide.

  @ApiProperty({
    type: Date,
    description: "In case market's going to start at future.",
    default: null,
  })
  @Column({ name: 'should_start_at', nullable: true, default: null })
  shouldStartAt: Date;

  @ApiProperty({
    type: Date,
    description:
      'At this date market will be closed, then will be handed to Oracle to be resolved.',
  })
  @Column({ name: 'should_resolve_at' })
  shouldResolveAt: Date;

  @ApiProperty({
    type: 'number',
    example: 2.0,
    description: 'The initial currency which will back outcome tokens values.',
  })
  @Column({ name: 'initial_liquidity', type: 'decimal' })
  initialLiquidity: number;

  @ApiProperty({
    type: 'number',
  })
  @Column({ name: 'collateral_token_id' })
  collateralTokenId: number;

  @ApiProperty({
    type: CryptocurrencyToken,
    description:
      'The type of cryptocurrency which is used to add value to market outcomes.',
  })
  @ManyToOne(() => CryptocurrencyToken, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'collateral_token_id' })
  collateralToken: CryptocurrencyToken;

  @ApiProperty({ type: 'number' })
  @Column({ name: 'amm_factory_id' })
  ammFactoryId: number;

  @ApiProperty({
    type: MarketMakerFactory,
    description:
      'Market creator data; Each specific type of market has its specific factory.',
  })
  @ManyToOne(() => MarketMakerFactory, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'amm_factory_id' })
  ammFactory: MarketMakerFactory;

  @ApiProperty({
    type: 'number',
    default: 2,
  })
  @Column({ name: 'num_of_outcomes', type: 'smallint', default: 2 })
  numberOfOutcomes: number;

  @ApiProperty({ type: 'string', nullable: true, default: null })
  @Column({ nullable: true })
  image: string;

  @ApiProperty({
    type: 'string',
    nullable: true,
    default: null,
    description: "The reference of this market's information",
  })
  @Column({ nullable: true })
  reference: string;

  @ApiProperty({ type: 'string', nullable: true, default: null })
  @Column({ nullable: true })
  description: string;
}
