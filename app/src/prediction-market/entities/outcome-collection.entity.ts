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

@Entity('outcome_collection')
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
    joinColumn: { name: 'market_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'prediction_outcome_id',
      referencedColumnName: 'id',
    },
  })
  possibleOutcomes: PredictionOutcome[]; // THINK: or ConditionalTokens?
}
