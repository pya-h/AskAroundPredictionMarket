import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class ChangePredictionMarketLiquidityDto {
  @ApiProperty({
    description: 'Liquidity change amount; Can be negative too.',
    required: true,
  })
  @IsNumber()
  amount: number;
}
