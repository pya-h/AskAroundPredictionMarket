import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { PredictionMarket } from './market.entity';
import { ApiProperty } from '@nestjs/swagger';
import { ConditionalToken } from './conditional-token.entity';
import { CryptocurrencyToken } from '../../blockchain-core/entities/cryptocurrency-token.entity';
import {
  PredictionMarketParticipationModesEnum,
  PredictionMarketParticipationResultsEnum,
} from '../enums/market-participation.enums';
import { User } from '../../user/entities/user.entity';

@Entity('prediction_market_participation')
export class PredictionMarketParticipation extends BaseEntity {
  @ApiProperty({ type: 'number' })
  @Column({ name: 'market_id', type: 'integer' })
  marketId: number;

  @ManyToOne(() => PredictionMarket, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'market_id' })
  market: PredictionMarket;

  @ApiProperty({
    type: 'string',
    example: PredictionMarketParticipationModesEnum.BUY.toString(),
    default: PredictionMarketParticipationModesEnum.BUY.toString(),
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: PredictionMarketParticipationModesEnum.BUY.toString(),
    enum: PredictionMarketParticipationModesEnum,
    enumName: 'PredictionMarketParticipationModesEnum',
  })
  mode: string;

  @ApiProperty({ type: 'number' })
  @Column({
    name: 'user_id',
    type: 'integer',
    nullable: true, // In case some account has done trading directly in blockchain
  })
  userId: number | null;

  @ApiProperty({ type: User })
  @ManyToOne(() => User, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'outcome_id', nullable: true, default: null })
  outcomeId: number;

  @ApiProperty({
    type: ConditionalToken,
    nullable: true,
    description:
      'The outcome participated on; Only null if participation type is providing liquidity.',
  })
  @ManyToOne(() => ConditionalToken, { eager: true })
  @JoinColumn({ name: 'outcome_id' })
  outcome: ConditionalToken | null;

  @ApiProperty({
    type: 'number',
  })
  @Column({ name: 'amount', type: 'float8' })
  amount: number;

  @ApiProperty({
    type: 'number',
    description: 'In case market has specified market fee upon creation.',
  })
  @Column({ name: 'market_fee', type: 'float8' })
  marketFee: number;

  @ApiProperty({
    type: 'number',
    description: `Amount of the real money payed`,
  })
  @Column({
    name: 'payment_amount',
    type: 'float8',
  })
  paymentAmount: number;

  @ApiProperty({
    type: 'number',
    description: `Id of the Token which trade is paid for.`,
  })
  @Column({ name: 'payment_token_id' })
  paymentTokenId: number; // In case market is backed with multiple collateral tokens, this would be useful

  @ApiProperty({
    type: CryptocurrencyToken,
    description: `Token which trade is paid for.`,
  })
  @ManyToOne(() => CryptocurrencyToken, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'payment_token_id' })
  paymentToken: CryptocurrencyToken;

  @ApiProperty({
    type: 'boolean',
    description: `Specifies whether the market which trade has happened in, is resolved and user has redeemed his/her reward.`,
    default: false,
  })
  @Column({ name: 'is_monetized' })
  isMonetized: boolean;

  get result() {
    if (
      this.mode ===
      PredictionMarketParticipationModesEnum.PROVIDE_LIQUIDITY.toString()
    )
      return PredictionMarketParticipationResultsEnum.NONE;

    if (this.outcome?.truenessRatio == null)
      return PredictionMarketParticipationResultsEnum.NOT_RESOLVED;

    switch (this.mode as PredictionMarketParticipationModesEnum) {
      case PredictionMarketParticipationModesEnum.BUY:
        if (this.outcome.truenessRatio === 1)
          return PredictionMarketParticipationResultsEnum.WON;
        if (this.outcome.truenessRatio === 0)
          return PredictionMarketParticipationResultsEnum.LOST;
        break;
      case PredictionMarketParticipationModesEnum.SELL:
        if (this.outcome.truenessRatio === 1)
          return PredictionMarketParticipationResultsEnum.LOST;
        if (this.outcome.truenessRatio === 0)
          return PredictionMarketParticipationResultsEnum.WON;
        break;
    }

    // TODO/ASK: What if 0 < trueness < 1
    return PredictionMarketParticipationResultsEnum.UNKNOWN;
  }
}
