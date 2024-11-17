import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from '../../blockchain/entities/cryptocurrency-token.entity';
import { Oracle } from './oracle.entity';
import { MarketMakerFactory } from '../../blockchain/entities/market-maker-factory.entity';

@Entity()
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

  @Column({ name: 'oracle_id', unique: true })
  oracleId: number;

  @ManyToOne(() => Oracle, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'oracle_id' })
  oracle: Oracle;

  @Column()
  question: string;

  @Column({ name: 'question_hash' })
  questionHash: string;

  @Column()
  shouldResolveAt: Date;

  @Column({ type: 'decimal' })
  initialLiquidity: number;

  @Column({ type: 'decimal' })
  liquidity: number;

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
