import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { UserNotificationSettings } from '../entities/user-notification-settings.entity';

export class UpdateNotificationSettingsDto extends OmitType(
  UserNotificationSettings,
  ['user', 'userId'],
) {
  @ApiProperty({
    description:
      'Whether the user should receive prediction result updates notifications',
  })
  @IsOptional()
  @IsBoolean()
  predictionResult: boolean;

  @ApiProperty({
    description: 'Whether the user should receive league updates notifications',
  })
  @IsOptional()
  @IsBoolean()
  leagues: boolean;

  @ApiProperty({
    description: 'Whether the user should receive level upgrade notifications',
  })
  @IsOptional()
  @IsBoolean()
  levelUpgrade: boolean;

  @ApiProperty({
    description: 'Whether the user should receive gas reception notifications',
  })
  @IsOptional()
  @IsBoolean()
  gasReception: boolean;

  @ApiProperty({
    description:
      'Whether the user should receive badge achievement notifications',
  })
  @IsOptional()
  @IsBoolean()
  newBadge: boolean;

  @ApiProperty({
    description: 'Whether to receive notification when achieving new medals.',
  })
  @IsOptional()
  @IsBoolean()
  newMedal: boolean;

  @ApiProperty({
    description:
      'Whether the user should receive a notifications when followed by another user',
  })
  @IsOptional()
  @IsBoolean()
  followedByUser: boolean;

  @ApiProperty({
    description: 'Whether the user should receive access request notifications',
  })
  @IsOptional()
  @IsBoolean()
  accessRequest: boolean;

  @ApiProperty({
    description:
      'Whether the user should receive a notifications when its access list makes a prediction',
  })
  @IsOptional()
  @IsBoolean()
  otherUserNewPrediction: boolean;

  @ApiProperty({
    description: 'Whether the user should receive push notifications',
  })
  @IsOptional()
  @IsBoolean()
  appPushNotification: boolean;

  // Arena notification settings:
  @ApiProperty({
    description:
      'Whether user is willing to receive notification in omen arena; If this option is disabled all arena notification settings will be overridden.',
  })
  @IsOptional()
  @IsBoolean()
  arenaWebPushSubscription: boolean;

  @ApiProperty({
    description:
      'Whether user is willing to receive notification when a new market is available.',
  })
  @IsOptional()
  @IsBoolean()
  newPredictionMarket: boolean;

  @ApiProperty({
    description:
      'Whether users are willing to receive notification when one of their participated markets results are ready.',
  })
  @IsOptional()
  @IsBoolean()
  predictionMarketResolved: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether user is willing to receive notification when a blockchain wallet deposit is successful.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  newBlockchainWalletDeposit: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive notification when a market will soon close, to notify them to participate or change decision.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  predictionMarketClosingSoon: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive notification when they have won a market bet.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  wonPredictionMarketBet: boolean;

  @ApiProperty({
    type: 'boolean',
    description:
      'Whether users are willing to receive news notification; works only if news is not force sent.',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  instantNews: boolean;

  @ApiProperty({
    description:
      'Whether user is willing to receive emails alongside each notification.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  receiveEmailNotification: boolean;
}
