import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { IsBooleanValue } from '../../core/decorators/is-boolean-value.decorator';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';
import { PredictionMarketParticipationSortByOptionsEnum } from '../enums/market-participation.enums';
import { PaginationOptionsDto } from '../../core/dtos/pagination-options.dto';

export class GetUserMarketsDto extends PaginationOptionsDto {
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
    description: 'Get redeemed markets or others',
  })
  @IsOptional()
  @IsBooleanValue()
  redeemed?: boolean;
}
