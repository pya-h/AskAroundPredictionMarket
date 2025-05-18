import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { config } from 'dotenv';
import { ConfigService } from 'src/config/config.service';

config();

const configService = new ConfigService();

export class ChargeBlockchainWalletDto {
  @ApiPropertyOptional({
    description: 'The chain which user intends to receive its native tokens.',
    required: false,
    default: +configService.getOrThrow<number>('NET_CHAIN_ID'),
  })
  @IsInt({ message: 'Chain id must be a positive integer.' })
  @IsPositive({ message: 'Chain id must be a positive integer.' })
  @IsOptional()
  chain?: number;

  @ApiProperty({
    description: 'The user id which needs wallet charge.',
    required: true,
  })
  @IsInt({ message: 'User id must be a positive integer.' })
  target: number;

  @ApiProperty({
    description:
      'Amount of native token being transferred to target user wallet..',
    required: true,
    default: 1.0,
  })
  @IsNumber()
  @IsPositive({ message: 'amount must be a positive number.' })
  amount: number;
}
