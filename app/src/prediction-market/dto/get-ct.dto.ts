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
import { PredictionMarketTradeModesEnum } from '../enums/market-participation.enums';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';

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
  @IsPositive()
  payment: number;

  @ApiPropertyOptional({
    enum: PredictionMarketTradeModesEnum,
    enumName: 'PredictionMarketTradeModesEnum',
    description:
      'Specify wether you want the purchasing price or selling price.',
    default: PredictionMarketTradeModesEnum.BUY,
    required: false,
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketTradeModesEnum, 'mode')
  mode?: PredictionMarketTradeModesEnum;
}
