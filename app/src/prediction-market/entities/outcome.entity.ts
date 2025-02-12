import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../core/base.entity';
import { Column, Entity } from 'typeorm';

@Entity('prediction_outcome')
export class PredictionOutcome extends BaseEntity {
  @ApiProperty({
    type: 'string',
    example: 'Yes',
  })
  @Column({ type: 'varchar', length: 64 })
  title: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ nullable: true })
  icon?: string;
}
