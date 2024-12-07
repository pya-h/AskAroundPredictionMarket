import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from '../../blockchain/entities/cryptocurrency-token.entity';
import { Oracle } from './oracle.entity';
import { MarketMakerFactory } from '../../blockchain/entities/market-maker-factory.entity';
import { Chain } from '../../blockchain/entities/chain.entity';
import { MarketCategory } from './market-category.entity';
import { User } from '../../user/entities/user.entity';
import { PredictionMarketTypesEnum } from '../../blockchain/enums/market-types.enum';

@Entity('prediction_market')
export class PredictionMarket extends BaseEntity {
  @Column({
    type: 'varchar',
    length: 16,
    default: PredictionMarketTypesEnum.LMSR.toString(),
    enum: PredictionMarketTypesEnum,
    enumName: 'PredictionMarketTypesEnum',
  })
  type: string;

  @Column({
    name: 'creator_id',
    type: 'integer',
    nullable: false,
  })
  creatorId: number;

  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'condition_id' })
  conditionId: string;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'oracle_id' })
  oracleId: number;

  @ManyToOne(() => Oracle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'oracle_id' })
  oracle: Oracle;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null; // TODO: null as a 'General' category, and leave this column nullable,
  // or Add a General Category via migrations and prevent this to be nullable. [Second one seems more logical]

  @ManyToOne(() => MarketCategory)
  @JoinColumn({ name: 'category_id' })
  category: MarketCategory | null;

  @Column({ type: 'varchar', length: 1024 })
  question: string;

  @Column({
    name: 'formatted_question',
    unique: true,
    type: 'varchar',
    length: 1100,
  })
  formattedQuestion: string;

  @Column({ name: 'question_hash' })
  questionHash: string;

  @Column({ name: 'subject', nullable: true, default: null })
  subject: string | null; // This is actually a short name for the market, useful when listing markets to prevent the list being too wide.

  @Column({ name: 'should_resolve_at' })
  shouldResolveAt: Date;

  @Column({ name: 'closed_at', nullable: true, default: null })
  closedAt: Date;

  @Column({ name: 'finalized_at', nullable: true, default: null })
  finalizedAt: Date;

  @Column({ name: 'initial_liquidity', type: 'decimal' })
  initialLiquidity: number;

  @Column({ type: 'decimal' })
  liquidity: number;

  @Column({ name: 'collateral_token_id' })
  collateralTokenId: number;

  @ManyToOne(() => CryptocurrencyToken, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'collateral_token_id' })
  collateralToken: CryptocurrencyToken;

  @Column({ name: 'amm_factory_id' })
  ammFactoryId: number;

  @ManyToOne(() => MarketMakerFactory, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'amm_factory_id' })
  ammFactory: MarketMakerFactory;

  @Column({ name: 'prepare_condition_tx_hash' })
  prepareConditionTxHash: string;

  @Column({ name: 'create_market_tx_hash' })
  createMarketTxHash: string;

  @Column({ name: 'num_of_outcomes', type: 'smallint', default: 2 })
  numberOfOutcomes: number;

  @OneToMany(() => ConditionalToken, (outcomeToken) => outcomeToken.market)
  outcomeTokens: ConditionalToken[];
}
