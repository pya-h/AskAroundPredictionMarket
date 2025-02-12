import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsNumberString,
  IsOptional,
  IsPositive,
  Min,
} from 'class-validator';

export class GetConditionalTokenBalanceQuery {
  @IsNumberString()
  @IsOptional()
  @ApiPropertyOptional({
    description: 'Index of the token.',
    required: false,
  })
  outcome?: string;
}

export class WhatYouGetQuery {
  @ApiProperty({
    description: 'Index of the token.',
    required: true,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return +value;
    }
    return value;
  })
  @IsNumber()
  @IsInt()
  @Min(0, { message: 'Outcome index must be a non-negative integer!' })
  outcome: number;

  @ApiProperty({
    description: 'Amount user whishes to pay.',
    required: true,
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return +value;
    }
    return value;
  })
  @IsNumber()
  @IsInt()
  @IsPositive()
  payment: number;
}
