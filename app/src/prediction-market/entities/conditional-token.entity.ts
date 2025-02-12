import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { BaseConditionalToken } from './bases/base-conditional-token.entity';
import { PredictionMarket } from './market.entity';

@Entity('conditional_token')
export class ConditionalToken extends BaseConditionalToken {
  @ManyToOne(() => PredictionMarket, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @ApiProperty({
    type: 'string',
    description: 'In blockchain, outcomes are identified by the collectionId',
    example:
      '0x0e9cb0b3062d8a830c23f411e33c15d010ec8ecbd559c575767cf30700419103',
  })
  @Column({ name: 'collection_id' })
  collectionId: string;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all investments made on the outcome.',
  })
  @Column({ name: 'amount_invested', type: 'float8', default: 0.0 })
  amountInvested: number;

  @ApiProperty({
    type: 'number',
    description: `Resolution data which will be specified by the oracle; Expected to be in [0, 1] range,
         indicating how much an outcome is correct in percentage; But its usually 1 or 0`,
  })
  @Column({
    name: 'trueness_ratio',
    type: 'float4',
    nullable: true,
    default: null,
  })
  truenessRatio: number;
}
