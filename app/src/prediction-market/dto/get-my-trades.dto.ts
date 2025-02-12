import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import {
  PredictionMarketParticipationResultsEnum,
  PredictionMarketParticipationSortByOptionsEnum,
  PredictionMarketTradeModesEnum,
} from '../enums/market-participation.enums';
import { PaginationOptionsDto } from '../../core/dtos/pagination-options.dto';
import { Transform } from 'class-transformer';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { IsBooleanValue } from 'src/core/decorators/is-boolean-value.decorator';

export class TradeHistoryOptionsDto extends PaginationOptionsDto {
  @ApiPropertyOptional({
    enum: PredictionMarketTradeModesEnum,
    enumName: 'PredictionMarketTradeModesEnum',
    description:
      'Specify this to filter only buy or sell trades; otherwise all trades will be fetched.',
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketTradeModesEnum, 'mode')
  mode?: PredictionMarketTradeModesEnum;

  @ApiPropertyOptional({
    enum: PredictionMarketParticipationSortByOptionsEnum,
    enumName: 'PredictionMarketParticipationSortByOptionsEnum',
    description:
      'Sort results by date, token amount or actual collateral token amount.',
    default: PredictionMarketParticipationSortByOptionsEnum.DATE,
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketParticipationSortByOptionsEnum, 'sort')
  sort?: PredictionMarketParticipationSortByOptionsEnum;

  @ApiPropertyOptional({
    description: 'Revert list order; Default order is ascending.',
  })
  @IsOptional()
  @IsBooleanValue()
  descending?: boolean;

  @ApiPropertyOptional({
    enum: PredictionMarketParticipationResultsEnum,
    enumName: 'PredictionMarketParticipationResultsEnum',
    description: 'Filter trade history by a specific trade result.',
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketParticipationResultsEnum, 'result')
  result?: PredictionMarketParticipationResultsEnum;

  @ApiPropertyOptional({
    description: 'Revert list order; Default order is ascending.',
  })
  @IsOptional()
  @IsNumber(
    {},
    {
      message:
        'Token index must be numeric and match market outcomes index sets.',
    },
  )
  @Transform(({ value }) => +value)
  @Min(0, { message: 'indexSet value can not be negative!' })
  indexSet?: number;

  @ApiPropertyOptional({
    description:
      'Find all trades related to a specific outcome value, e.g. Yes.',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value.trim())
  outcome?: string;
}

export class TotalTradeOptionsDto extends OmitType(TradeHistoryOptionsDto, [
  'result',
]) {}
