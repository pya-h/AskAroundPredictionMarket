import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TradeCoditionalToken {
  @ApiProperty({
    description: 'Market Id',
    required: true,
  })
  @IsNotEmpty({ message: 'Trade must happen inside an specific market.' })
  @IsInt({ message: 'Id of the market must be a Positive integer.' })
  @IsPositive({ message: 'Id of the market must be a Positive integer.' })
  marketId: number;

  @ApiProperty({
    description: 'The index of outcome user intends to trade.',
    required: true,
  })
  @IsInt({ message: 'Outcome index must be an integer.' })
  outcomeIndex: number;

  @ApiProperty({
    description: 'Amount of this outcome token user intends to trade.',
    default: 1.0,
  })
  @IsNumber()
  @IsPositive({ message: 'The amount of token must be positive.' })
  amount: number;
}
