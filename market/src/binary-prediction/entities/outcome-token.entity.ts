import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { BinaryPredictionMarket } from './market.entity';
import { PredictionOutcome } from './outcome.entity';

@Entity()
export class OutcomeToken extends BaseEntity {
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => BinaryPredictionMarket)
  market: BinaryPredictionMarket;

  @Column({ name: 'outcome_id', type: 'integer' })
  outcomeId: number;

  @ManyToOne(() => PredictionOutcome)
  outcome: PredictionOutcome; // TODO: Or maybe linked to binary_prediction_outcome table!?

  @Column({ type: 'decimal' })
  price: number;
}
