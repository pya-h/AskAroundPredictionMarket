import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { BinaryPredictionMarket } from './market.entity';
import { PredictionOutcome } from './outcome.entity';

@Entity()
export class ConditionalToken extends BaseEntity {
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => BinaryPredictionMarket)
  @JoinColumn({ name: 'market_id' })
  market: BinaryPredictionMarket;

  @Column({ name: 'collection_id', type: 'integer' })
  collectionId: string;

  @Column({ name: 'index_set' })
  indexSet: number;

  @Column({ name: 'prediction_outcome_id' })
  predictionOutcomeId: number;

  @ManyToOne(() => PredictionOutcome, { eager: true })
  @JoinColumn({ name: 'prediction_outcome_id' })
  predictionOutcome: PredictionOutcome;

  @Column({ type: 'decimal' })
  price: number;
}
