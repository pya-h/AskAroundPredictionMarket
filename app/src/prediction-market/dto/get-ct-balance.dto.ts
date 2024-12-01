import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString } from 'class-validator';

export class GetConditionalTokenBalanceQuery {
  @IsNumberString()
  @ApiProperty({
    description: 'Id of the market including the token.',
    required: true,
  })
  market: string;

  @IsNumberString()
  @ApiProperty({
    description: 'Index of the token.',
    required: true,
  })
  indexset?: string;
}
