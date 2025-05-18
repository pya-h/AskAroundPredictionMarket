import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { config } from 'dotenv';
import { ConfigService } from 'src/config/config.service';

config();

const configService = new ConfigService();

export class ReceiveFreeNativeTokensDto {
  @ApiPropertyOptional({
    description: 'The chain which user intends to receive its native tokens.',
    required: false,
    default: +configService.getOrThrow<number>('NET_CHAIN_ID'),
  })
  @IsInt({ message: 'Chain id must be a positive integer.' })
  @IsPositive({ message: 'Chain id must be a positive integer.' })
  @IsOptional()
  chain?: number;
}
