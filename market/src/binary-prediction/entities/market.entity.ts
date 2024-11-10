import { PredictionOutcome } from './outcome.entity';
import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinTable, ManyToMany } from 'typeorm';

@Entity()
export class BinaryPredictionMarket extends BaseEntity {
  @Column()
  question: string;

  @Column()
  shouldResolveAt: Date;

  @ManyToMany(() => PredictionOutcome, { onDelete: 'CASCADE', eager: true })
  @JoinTable({
    name: 'binary_prediction_outcome',
    joinColumn: { name: 'binary_prediction_id', referencedColumnName: 'id' },
    inverseJoinColumn: {
      name: 'prediction_outcome_id',
      referencedColumnName: 'id',
    },
  })
  outcomes: PredictionOutcome[];

  @Column({ type: 'decimal' })
  liquidity: number;
}
