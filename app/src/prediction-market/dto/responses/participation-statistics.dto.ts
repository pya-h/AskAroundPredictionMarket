import { ApiProperty } from '@nestjs/swagger';

export class ParticipationStatisticsDto {
  @ApiProperty({ type: 'number' })
  numberOfPurchases: number;

  @ApiProperty({ type: 'number' })
  numberOfSells: number;

  @ApiProperty({ type: 'number' })
  numberOfTrades: number;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all outcome amounts purchased by user(s).',
  })
  totalPurchases: number | bigint;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all outcome amounts sold by user(s).',
  })
  totalSells: number;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all collaterals transacted while buying.',
  })
  totalCollateralPayments: number | bigint;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all collaterals transacted while selling.',
  })
  totalCollateralPayouts: number;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all withdrawals made by user(s).',
  })
  totalPayouts: number;

  @ApiProperty({
    type: 'number',
    description: 'Number of distinct outcomes purchased or sold.',
  })
  numberOfOutcomesTraded: number;

  @ApiProperty({
    type: 'number',
    description: 'Number of distinct outcomes purchased.',
  })
  numberOfOutcomesPurchased: number;

  @ApiProperty({
    type: 'number',
    description: 'Number of distinct outcomes sold.',
  })
  numberOfOutcomesSold: number;

  @ApiProperty({
    type: 'number',
    description: 'The id of the most popular category; Sports by default.',
  })
  popularTopicId: number;
}

export class GeneralParticipationStatisticsDto extends ParticipationStatisticsDto {
  @ApiProperty({
    type: 'number',
    description: 'Sum of all collaterals received by users while selling.',
  })
  totalCollateralPayouts: number;

  @ApiProperty({ type: 'number' })
  numberOfActivePlayers: number;

  @ApiProperty({
    type: 'number',
    description: 'Number of all markets resolved or not.',
  })
  numberOfMarkets: number;

  @ApiProperty({
    type: 'number',
    description: 'Number of all ongoing markets (markets not resolved)',
  })
  numberOfActiveMarkets: number;

  @ApiProperty({ type: 'number' })
  numberOfResolvedMarkets: number;

  @ApiProperty({
    type: 'number',
    description:
      'Number of all closed markets, resolved or waiting to be resolved.',
  })
  numberOfClosedMarkets: number;

  @ApiProperty({
    type: 'number',
    description: 'Closed markets waiting for oracle.',
  })
  numberOfMarketsWaitingToBeResolved: number;

  @ApiProperty({ type: 'number' })
  numberOfOutcomes: number;

  @ApiProperty({
    type: 'number',
    description: 'Distinct outcomes not resolved yet.',
  })
  numberOfActiveOutcomes: number;

  @ApiProperty({ type: 'number' })
  numberOfResolvedOutcomes: number;

  @ApiProperty({
    type: 'number',
    description:
      'Sum of all collateral token equivalent balances in all markets so far.',
  })
  totalOraclePool: number;

  @ApiProperty({
    type: 'number',
    description:
      'Number of all outcomes transferred across omen arena by all users.',
  })
  totalOutcomesTransferred: number;

  @ApiProperty({
    type: 'number',
    description: 'Sum of all collaterals transferred across OmenArena so far.',
  })
  totalMarketVolume: number;

  @ApiProperty({
    type: 'number',
    description:
      'Sum of all collaterals transferred across OmenArena in the last 24 hours.',
  })
  marketVolumeIn24h: number;

  @ApiProperty({
    type: 'number',
    description:
      'Sum of all collaterals payed by users in OmenArena markets in the last 24 hours.',
  })
  collateralPaymentsIn24h: number;

  @ApiProperty({
    type: 'number',
    description:
      'Sum of all collaterals payed by OmenArena to users from user sells in markets, in the last 24 hours.',
  })
  collateralPayoutsIn24h: number;
}

export class UserParticipationStatisticsDto extends ParticipationStatisticsDto {
  @ApiProperty({
    type: 'number',
    description:
      'Number of outcomes traded by user which their market is closed, but not resolved yet.',
  })
  numberOfTradedOutcomesWaitingToBeResolved: number;

  @ApiProperty({ type: 'number' })
  numberOfParticipatedMarkets: number;

  @ApiProperty({ type: 'number' })
  numberOfParticipatedMarketsClosed: number;

  @ApiProperty({ type: 'number' })
  numberOfParticipatedMarketsResolved: number;

  @ApiProperty({
    type: 'number',
    description:
      'Markets user participated, which are closed and waiting for oracle.',
  })
  numberOfParticipatedMarketsWaitingToBeResolved: number;

  @ApiProperty({ type: 'number' })
  numberOfCreatedMarkets: number;

  @ApiProperty({ type: 'number' })
  wonPredicts: number;

  @ApiProperty({ type: 'number' })
  totalRewards: number;

  @ApiProperty({ type: 'number', description: 'User total shares so far.' })
  currentShares: number;
}
