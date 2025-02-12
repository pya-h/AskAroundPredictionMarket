import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../core/base.entity';
import { PredictionOutcome } from '../outcome.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BasePredictionMarket } from './base-market.entity';

@Entity('base_conditional_token')
export class BaseConditionalToken extends BaseEntity {
  // Also could be used for holding preserved market outcomes.
  @ApiProperty({ type: 'number' })
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => BasePredictionMarket, { onDelete: 'CASCADE' }) // BasePredictionMarket n BaseConditionalToken are just temporary instances,
  //  waiting to be converted to PredictionMarket n ConditionalToken entities
  @JoinColumn({ name: 'market_id' })
  market: BasePredictionMarket;

  @ApiProperty({
    type: 'number',
    description: `Index of the outcome, inside outcomes list; In blockchain, outcomes are identified with their position index [not their text];
     so this is to hold the correct index of the outcome [in case outcomeTokens list has an invalid order]`,
  })
  @Column({ name: 'token_index' })
  tokenIndex: number;

  @ApiProperty({ type: 'number' })
  @Column({ name: 'prediction_outcome_id' })
  predictionOutcomeId: number;

  @ApiProperty({
    type: PredictionOutcome,
    description: 'Outcome extra info, useful for frontend representation.',
  })
  @ManyToOne(() => PredictionOutcome, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'prediction_outcome_id' })
  predictionOutcome: PredictionOutcome;

  @ApiPropertyOptional({
    type: 'varchar',
    nullable: true,
    default: null,
    description: 'Outcome describer, 256 characters max.',
  })
  @Column({ nullable: true, type: 'varchar', length: 256 })
  description?: string;
}
