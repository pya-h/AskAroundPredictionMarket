import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from '../../blockchain/entities/cryptocurrency-token.entity';
import { Oracle } from './oracle.entity';
import { MarketMakerFactory } from '../../blockchain/entities/market-maker-factory.entity';
import { Chain } from '../../blockchain/entities/chain.entity';
import { MarketCategory } from './market-category.entity';

@Entity('binary_prediction_market')
export class BinaryPredictionMarket extends BaseEntity {
  // notes: market is equivalent to 'condition' in gnosis contracts.

  @Column({
    name: 'creator_id',
    type: 'integer',
    nullable: false,
  })
  creatorId: number;

  // @ManyToOne(() => creator)
  // @JoinColumn({ name: 'creator_id' })
  // creator: creator;

  @Column({ name: 'condition_id', unique: true })
  conditionId: string;

  @Column({ name: 'oracle_id' })
  oracleId: number;

  @ManyToOne(() => Oracle, { onDelete: 'NO ACTION' })
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

  @Column()
  shouldResolveAt: Date;

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

  @OneToMany(() => ConditionalToken, (outcomeToken) => outcomeToken.market)
  outcomeTokens: ConditionalToken[];
}
