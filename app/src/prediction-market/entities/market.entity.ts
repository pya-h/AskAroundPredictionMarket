import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from '../../blockchain/entities/cryptocurrency-token.entity';
import { Oracle } from './oracle.entity';
import { MarketMakerFactory } from '../../blockchain/entities/market-maker-factory.entity';
import { Chain } from '../../blockchain/entities/chain.entity';
import { MarketCategory } from './market-category.entity';
import { User } from '../../user/entities/user.entity';

@Entity('prediction_market')
export class PredictionMarket extends BaseEntity {
  // notes: market is equivalent to 'condition' in gnosis contracts.

  @Column({
    name: 'creator_id',
    type: 'integer',
    nullable: false,
  })
  creatorId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'creator_id' })
  creator: User;

  @Column({ name: 'condition_id' })
  conditionId: string;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'oracle_id', nullable: true })
  oracleId: number;

  @ManyToOne(() => Oracle, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'oracle_id' })
  oracle: Oracle;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ name: 'category_id', nullable: true })
  categoryId: number | null; // TODO: Cnsider null as a 'General' category, and live this column nullable,
  // or Add a General Category via migrations and prevent this to be nullable. [Second one seems more logical]

  @ManyToOne(() => MarketCategory)
  @JoinColumn({ name: 'category_id' })
  category: MarketCategory | null;

  @Column()
  question: string;

  @Column({ name: 'question_hash' })
  questionHash: string;

  @Column({ name: 'subject', nullable: true, default: null })
  subject: string | null; // This is actually a short name for the market, useful when listing markets to prevent the list being too wide.

  @Column({ name: 'should_resolve_at' })
  shouldResolveAt: Date;

  @Column({ name: 'finalized_at', nullable: true, default: null })
  finalizedAt: Date;

  @Column({ type: 'decimal' })
  initialLiquidity: bigint;

  @Column({ type: 'decimal' })
  liquidity: bigint;

  @Column({ name: 'collateral_token_id' })
  collateralTokenId: number;

  @ManyToOne(() => CryptocurrencyToken, { eager: true })
  @JoinColumn({ name: 'collateral_token_id' })
  collateralToken: CryptocurrencyToken;

  @Column({ name: 'amm_factory_id' })
  ammFactoryId: number;

  @ManyToOne(() => MarketMakerFactory)
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
