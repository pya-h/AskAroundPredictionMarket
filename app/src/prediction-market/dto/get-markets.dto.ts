import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationOptionsDto } from 'src/core/dtos/pagination-options.dto';
import { PredictionMarketStatusEnum } from '../enums/market-status.enum';
import { PredictionMarketSortOptionsDto } from '../enums/prediction-market-sort-options.enum';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { IsBooleanValue } from 'src/core/decorators/is-boolean-value.decorator';

export class GetMarketsQuery extends PaginationOptionsDto {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description:
      'Retrieve markets by a specific category, by providing the id of that category.',
    required: false,
  })
  category?: number;

  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Retrieve markets created by a specific user.',
    required: false,
  })
  creator?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Retrieve markets which have a specific subject.',
    required: false,
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'The current status of the market.',
    enum: PredictionMarketStatusEnum,
    enumName: 'PredictionMarketStatusEnum',
    required: false,
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketStatusEnum, 'status')
  status?: string;

  @ApiPropertyOptional({
    enum: PredictionMarketSortOptionsDto,
    enumName: 'PredictionMarketSortOptionsDto',
    description:
      'Sort markets by specific date, number of outcomes, question or number of participants',
    default: PredictionMarketSortOptionsDto.CREATION_DATE,
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketSortOptionsDto, 'sort')
  sort?: PredictionMarketSortOptionsDto;

  @ApiPropertyOptional({
    description: 'Revert list order; Default order is ascending.',
  })
  @IsOptional()
  @IsBooleanValue()
  descending?: boolean;
}
