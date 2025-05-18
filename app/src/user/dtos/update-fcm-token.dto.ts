import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateFcmTokenDto {
  @ApiProperty({ description: 'The new FCM token' })
  @IsNotEmpty()
  @IsString()
  fcmToken: string;
}
