import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from 'src/blockchain/entities/cryptocurrency-token.entity';

@Entity()
export class BinaryPredictionMarket extends BaseEntity {
  // notes: market is equivalent to 'condition' in gnosis contracts.
  @Column({ name: 'condition_id', unique: true })
  conditionId: string;

  @Column()
  question: string;

  @Column({ name: 'question_hash' })
  questionHash: string;

  @Column()
  shouldResolveAt: Date;

  @Column({ type: 'decimal' })
  liquidity: number;

  @Column({ name: 'collateral_token_id' })
  collateralTokenId: number;

  @ManyToOne(() => CryptocurrencyToken, { eager: true })
  @JoinColumn({ name: 'collateral_token_id' })
  collateralToken: CryptocurrencyToken;

  @OneToMany(() => ConditionalToken, (outcomeToken) => outcomeToken.market)
  outcomeTokens: ConditionalToken[];
}
