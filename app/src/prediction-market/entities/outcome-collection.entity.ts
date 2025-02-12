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
import { ApiProperty } from '@nestjs/swagger';

@Entity('outcome_collection')
export class OutcomeCollection extends BaseEntity {
  @ApiProperty({ type: 'number' })
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ApiProperty({ type: PredictionMarket })
  @ManyToOne(() => PredictionMarket)
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @ApiProperty({
    type: 'string',
    description:
      'The hashed identifier of one or collection ot outcomes in blockchain',
    example:
      '0x6ec1630cb79d752f2a9aba6f1e38c54f09bb91a1dfca3c9a7edb4e9496a56cd7',
  })
  @Column({ name: 'collection_id' })
  collectionId: string;

  @ApiProperty({
    type: 'number',
    description:
      "The decimal value of the outcome's BitArray in market's collections;",
    example:
      "(indexSetDecimal= 2) is the decimal value of bit-array 010 indicating an occasion which outcome B did happen, but A & C did't",
  })
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
  possibleOutcomes: PredictionOutcome[];
}
