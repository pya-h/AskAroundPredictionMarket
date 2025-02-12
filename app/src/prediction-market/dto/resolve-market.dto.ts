import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class ResolvePredictionMarketDto {
  @ApiPropertyOptional({
    description: 'The index of outcome user intends to trade.',
    required: false,
    default: null,
  })
  @IsInt({ message: 'Outcome index must be an integer.' })
  @Min(0, { message: 'Outcome index can not be negative' })
  @IsOptional()
  correctOutcome?: number;

  @ApiPropertyOptional({
    description:
      'The ratio of the trueness of each outcome, each element position matches the outcome tokens with that index.',
    required: false,
    isArray: true,
    default: null,
  })
  @Min(0, {
    each: true,
    message:
      'You are free to specify nearly any value for each outcome trueness, but they must be positive integers though.',
  })
  @IsInt({
    each: true,
    message:
      'You are free to specify nearly any value for each outcome trueness, but they must be positive integers though.',
  })
  @IsArray()
  @IsOptional()
  truenessRato?: number[];

  @ApiPropertyOptional({
    description:
      'If admin intends to force a centralized oracle to resolve a market. This flag is some kind of safety measure.',
    required: false,
    default: null,
  })
  @IsBoolean({ message: 'The field can only be true or false or left empty.' })
  @IsOptional()
  force?: boolean;
  // hint: resolving a market can only be done with exactly one approach (field)
}
