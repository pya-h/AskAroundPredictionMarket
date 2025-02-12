import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { GetMarketsQuery } from './get-markets.dto';
import { ReservedPredictionMarketSortOptionsDto } from '../enums/prediction-market-sort-options.enum';
import { IsDate, IsOptional } from 'class-validator';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { Type } from 'class-transformer';

export class GetReservedMarketsQuery extends OmitType(GetMarketsQuery, [
  'status',
  'sort',
]) {
  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({
    description: 'Filter markets which start after a specific date.',
    required: false,
  })
  @IsOptional()
  willStartBefore?: Date;

  @ApiPropertyOptional({
    enum: ReservedPredictionMarketSortOptionsDto,
    enumName: 'ReservedPredictionMarketSortOptionsDto',
    description:
      'Sort markets by specific date, number of outcomes, question or number of participants',
    default: ReservedPredictionMarketSortOptionsDto.START_DATE,
  })
  @IsOptional()
  @IsEnumDetailed(ReservedPredictionMarketSortOptionsDto, 'sort')
  sort?: ReservedPredictionMarketSortOptionsDto;
}
