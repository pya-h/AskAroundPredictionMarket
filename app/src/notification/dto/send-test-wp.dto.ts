import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { NotificationTypeEnum } from '../enums/notification-type.enum';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class SendTestWebPushNotificationDto {
  @ApiPropertyOptional({
    enumName: 'NotificationTypeEnum',
    enum: NotificationTypeEnum,
    default: NotificationTypeEnum.PREDICTION_MARKET_IS_RESOLVED,
  })
  @IsOptional()
  @IsEnumDetailed(NotificationTypeEnum)
  type?: NotificationTypeEnum;

  @ApiProperty({ type: 'string', default: 'Test' })
  @IsOptional()
  @IsString()
  title: string;

  @ApiProperty({ type: 'string', default: 'This is a test' })
  @IsOptional()
  @IsString()
  body: string;

  @ApiProperty({ description: 'Extra data such as link ...' })
  @IsOptional()
  @IsObject()
  data: Record<string, string>;
}
