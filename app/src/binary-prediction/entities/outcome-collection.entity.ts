import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { BinaryPredictionMarket } from './market.entity';
import { PredictionOutcome } from './outcome.entity';

@Entity()
export class OutcomeCollection extends BaseEntity {
  //TODO: THINK: This or ConditionTokens?
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => BinaryPredictionMarket)
  @JoinColumn({ name: 'market_id' })
  market: BinaryPredictionMarket;

  @Column({ name: 'collection_id' })
  collectionId: string;

  @Column({ name: 'index_set' })
  index_set: number;

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
