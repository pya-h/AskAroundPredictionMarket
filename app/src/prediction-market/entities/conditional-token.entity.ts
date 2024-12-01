import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { PredictionMarket } from './market.entity';
import { PredictionOutcome } from './outcome.entity';

@Entity('conditional_token')
export class ConditionalToken extends BaseEntity {
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => PredictionMarket, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @Column({ name: 'collection_id' })
  collectionId: string;

  @Column({ name: 'token_index' })
  tokenIndex: number;

  @Column({ name: 'prediction_outcome_id' })
  predictionOutcomeId: number;

  @ManyToOne(() => PredictionOutcome, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'prediction_outcome_id' })
  predictionOutcome: PredictionOutcome;

  @Column({ type: 'float8', default: '0.0' })
  price: number;
}
