import { BaseEntity } from '../../core/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('prediction_outcome')
export class PredictionOutcome extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @Column({ nullable: true })
  icon?: string;
}
