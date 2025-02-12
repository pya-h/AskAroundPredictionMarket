import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';
import { GetConditionalTokenBalanceQuery } from './get-ct.dto';

export class GetConditionalTokenPriceQuery extends GetConditionalTokenBalanceQuery {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Amount of outcome user intends to know its price',
    required: false,
    default: '1',
  })
  amount?: string;
}
