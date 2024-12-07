import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationOptionsDto } from 'src/core/dtos/pagination-options.dto';
import { PredictionMarketStatusEnum } from '../enums/market-status.enum';

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
  @IsString()
  @ApiPropertyOptional({
    description: 'Retrieve markets which have a specific subject.',
    required: false,
  })
  subject?: string;

  @ApiPropertyOptional({
    description: 'The current status of the market.',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(Object.values(PredictionMarketStatusEnum))
  status?: string;
}
