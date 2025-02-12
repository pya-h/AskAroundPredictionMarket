import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { PredictionMarket } from '../../entities/market.entity';
import { OutcomeTokenInfoDto } from './outcome-token-info.dto';
import { PredictionMarketStatusEnum } from '../../enums/market-status.enum';
import { PublicUserData } from '../../../user/dto/public-user-data.dto';
import { RedeemHistory } from 'src/prediction-market/entities/redeem-history.entity';

/**
 * Provides all important outcome data, and some extra statistics information, all as a flat easy to view object;
 */
export class OutcomeStatistics extends OmitType(OutcomeTokenInfoDto, [
  'token',
]) {
  @ApiProperty({ type: 'string' })
  icon: string;
  @ApiPropertyOptional({
    type: 'number',
    description: `Resolution data which will be specified by the oracle; Expected to be in [0, 1] range,
         indicating how much an outcome is correct in percentage; But its usually 1 or 0`,
  })
  truenessRatio?: number;

  @ApiProperty({
    type: 'number',
    description:
      'How much an outcome may happen from users perspective, in percentage.',
    nullable: true,
  })
  participationPossibility: number;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all investments made on the outcome.',
  })
  investment: number;

  @ApiProperty({
    type: 'string',
    description: 'In blockchain, outcomes are identified by the collectionId',
    example:
      '0x0e9cb0b3062d8a830c23f411e33c15d010ec8ecbd559c575767cf30700419103',
  })
  collectionId: string;
}

export class PredictionMarketEntityWithParticipantsCount extends PredictionMarket {
  @ApiProperty({
    type: 'number',
    description: 'Number of players participated in this market.',
  })
  participants: number;
}

export class PredictionMarketExtraDto extends OmitType(
  PredictionMarketEntityWithParticipantsCount,
  ['statistics', 'status', 'creator', 'totalInvestment'],
) {
  @ApiProperty({
    enum: PredictionMarketStatusEnum,
    enumName: 'PredictionMarketStatusEnum',
  })
  status: PredictionMarketStatusEnum;

  @ApiProperty({
    type: PublicUserData,
    description:
      'Creator data; If endpoint called by admin, the full user data will be sent',
  })
  creator: PublicUserData;

  @ApiProperty({ type: OutcomeStatistics, isArray: true })
  statistics: OutcomeStatistics[];

  @ApiProperty({
    type: 'number',
    default: 0.0,
    description:
      'Sum of all token amounts bought from this market; In other works this equals sum of all outcome.amountInvested values.',
  })
  totalInvestment: number;

  @ApiProperty({
    type: 'boolean',
    default: false,
    description:
      'Extra flag to distinguish deployed markets from scheduled(reserved) markets [in client side].',
  })
  isReserved: boolean;
}

export class OutcomeStatisticsWithParticipants extends OutcomeStatistics {
  @ApiProperty({
    type: 'number',
    description:
      'Number of players users participated(buy/sell) on this outcome.',
  })
  participants: number;
}
export class PredictionMarketExtraWithExtraStatisticsDto extends OmitType(
  PredictionMarketExtraDto,
  ['statistics'],
) {
  @ApiProperty({ type: OutcomeStatisticsWithParticipants, isArray: true })
  statistics: OutcomeStatisticsWithParticipants[];

  @ApiProperty({
    type: 'number',
    description: 'Total amount of collateral users have put while buying.',
    nullable: true,
    default: 0,
  })
  oraclePool: number;
}

export class RedeemHistoryUnloaded extends OmitType(RedeemHistory, [
  'redeemer',
  'token',
]) {}

export class UserMarketsListResponseDto extends OmitType(
  PredictionMarketExtraDto,
  [
    'category',
    'collateralToken',
    'outcomeTokens',
    'totalInvestment',
    'statistics',
    'oracle',
    'chain',
    'ammFactory',
    'creator',
  ],
) {
  @ApiProperty({
    type: 'number',
    description:
      'Total amount of outcomes transferred by user while trading in the market.',
  })
  myTotalAmountsTransferred: number;

  @ApiProperty({
    type: 'number',
    description:
      'Total amount of collateral transferred by user while trading in the market.',
  })
  myTotalCollateralTransferred: number;

  @ApiProperty({
    type: 'number',
    description: 'Total amount of collateral users have put while buying.',
    nullable: true,
    default: 0,
  })
  oraclePool: number;

  @ApiPropertyOptional({
    type: RedeemHistoryUnloaded,
    description:
      'The redeem result on this market (if market is resolved and user has redeemed rewards)',
    nullable: true,
  })
  redeemResult?: RedeemHistoryUnloaded;
}
