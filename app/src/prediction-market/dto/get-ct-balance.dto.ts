import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class GetConditionalTokenBalanceQuery {
  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Index of the token.',
    required: false,
  })
  outcome?: string;
}
