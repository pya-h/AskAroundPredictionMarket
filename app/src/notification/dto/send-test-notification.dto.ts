import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsEnum } from 'class-validator';

enum NotificationType {
  NewBadge = 'new-badge',
  AccessRequest = 'access-request',
  NewLevelUpgrade = 'new-level-upgrade',
  PredictionWon = 'prediction-won',
  PredictionLost = 'prediction-lost',
  FollowedByUser = 'followed-by-user',
  FollowRequest = 'follow-request',
  GasReception = 'gas-reception',
  OtherUserNewPrediction = 'other-user-new-prediction',
  LeagueStarted = 'league-started',
  LeagueResult = 'league-result',
}

export class SendTestNotificationDto {
  @ApiProperty()
  @IsNumber()
  userId: number;

  @ApiProperty({ enumName: 'NotificationType', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;
}
