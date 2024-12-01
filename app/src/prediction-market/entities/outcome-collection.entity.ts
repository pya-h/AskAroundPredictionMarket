import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { PredictionMarket } from './market.entity';
import { PredictionOutcome } from './outcome.entity';

// NOTICE: For now, server uses ConditionalToken entity, for simple trading of outcomes, but for trading a set of outcomes, this entity must be used
//  if so, you should first write migrations for this
@Entity('outcome_token')
export class OutcomeCollection extends BaseEntity {
  //TODO: THINK: We should use this or ConditionalTokens?
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => PredictionMarket)
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @Column({ name: 'collection_id' })
  collectionId: string;

  @Column({ name: 'index_set_dec' })
  indexSetDecimal: number;

  @ManyToMany(() => PredictionOutcome, { eager: true })
  @JoinTable({
    name: 'possible_outcomes',
    joinColumn: { name: 'market', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'prediction_outcome_id',
      referencedColumnName: 'id',
    },
  })
  possibleOutcomes: PredictionOutcome[]; // THINK: or ConditionalTokens?
}
