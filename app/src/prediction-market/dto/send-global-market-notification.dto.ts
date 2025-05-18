import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsPositive } from 'class-validator';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';

export enum GlobalPredictionMarketNotificationTypes {
  NEW_MARKET = 'new',
  MARKET_RESOLVED = 'resolved',
  MARKET_SOON_CLOSES = 'close-soon',
}

export class SendGlobalMarketNotificationDto {
  @ApiProperty({
    required: true,
  })
  @IsNotEmpty({ message: 'Trade must happen inside an specific market.' })
  @IsInt({ message: 'Id of the market must be a Positive integer.' })
  @IsPositive({ message: 'Id of the market must be a Positive integer.' })
  marketId: number;

  @ApiProperty({
    description:
      'Specifies whether the notification is about a new market being available or an old market being resolved',
    enumName: 'GlobalPredictionMarketNotificationTypes',
    default: GlobalPredictionMarketNotificationTypes.NEW_MARKET,
  })
  @IsNotEmpty()
  @IsEnumDetailed(GlobalPredictionMarketNotificationTypes)
  type: GlobalPredictionMarketNotificationTypes;
}
