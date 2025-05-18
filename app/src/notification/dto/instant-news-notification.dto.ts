import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class InstantNewsNotificationDto {
  @ApiPropertyOptional({ type: 'string' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ type: 'string' })
  @MinLength(5, {
    message:
      'Notification content too short; Try texts exceeding 5 characters.',
  })
  @IsString()
  content: string;

  @ApiProperty({ description: 'Extra data such as link ...' })
  @IsOptional()
  @IsObject()
  data: Record<string, string>;

  @ApiPropertyOptional({
    description:
      'Use force send feature for crucial news; Setting this to true will cause even those who have disabled news notification would receive this.',
    required: false,
    default: null,
  })
  @IsBoolean({ message: 'The field can only be true or false or left empty.' })
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({
    description: `Use force email feature for crucial news; Setting this to true will cause even those who have disabled email notification,
       receive this one's notification email.
       Notice: It's dependent on 'force'; In case force is false & forceEmail is true, it only force-sends notification email to those 
       that have Instant News option On;`,
    required: false,
    default: null,
  })
  @IsBoolean({ message: 'The field can only be true or false or left empty.' })
  @IsOptional()
  forceEmail?: boolean;

  @ApiPropertyOptional({
    description: `Specific email body; If not set the notification content will be used.`,
    required: false,
    default: null,
  })
  @MinLength(5, {
    message: 'Email body too short! Try texts exceeding 5 characters.',
  })
  @IsOptional()
  emailBody?: string;
}
