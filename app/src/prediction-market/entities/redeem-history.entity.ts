import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { PredictionMarket } from './market.entity';
import { ApiProperty } from '@nestjs/swagger';
import { CryptocurrencyToken } from '../../blockchain-core/entities/cryptocurrency-token.entity';

import { User } from '../../user/entities/user.entity';

@Entity('redeem_history')
export class RedeemHistory extends BaseEntity {
  @ApiProperty({ type: 'number' })
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => PredictionMarket, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @ApiProperty({
    type: 'string',
    example:
      '0x9355a7ec078d2451ee9584a25069dafa72cb184ae93c0f22cab73e13ac50300d',
    description:
      'The condition user redeeming on; In case of market with multiple conditions.',
  })
  @Column({ name: 'condition_id' })
  conditionId: string;

  @ApiProperty({
    type: 'string',
    description:
      'In case redeemed condition is a sub condition of a parent condition.',
  })
  @Column({ name: 'parent_collection_id' })
  parentCollectionId: string;

  @ApiProperty({ type: 'number' })
  @Column({
    name: 'redeemer_id',
    type: 'integer',
    nullable: true, // In case some account has done redeem directly in blockchain and does not have user here (just to hold market total redeems)
  })
  redeemerId: number | null;

  @ApiProperty({ type: User })
  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'redeemer_id' })
  redeemer: User | null;

  @ApiProperty({
    type: 'number',
    description: `Amount of collateral received by user after redeem`,
  })
  @Column({
    name: 'payout',
    type: 'float8',
  })
  payout: number;

  @ApiProperty({
    type: 'number',
    description: `Id of the Payout token; In case market is backed with multiple tokens.`,
  })
  @Column({ name: 'token_id' })
  tokenId: number;

  @ApiProperty({
    type: CryptocurrencyToken,
    description: `Payout token.`,
  })
  @ManyToOne(() => CryptocurrencyToken, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'token_id' })
  token: CryptocurrencyToken;

  @ApiProperty({
    type: 'number',
    isArray: true,
  })
  @Column({
    name: 'index_sets',
    type: 'integer',
    array: true,
  })
  indexSets: number[];
}
