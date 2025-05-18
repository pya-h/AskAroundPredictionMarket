import { IsOptional } from 'class-validator';
import { PaginationOptionsDto } from '../../core/dtos/pagination-options.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberStringTransformed } from 'src/core/decorators/is-number-string-transformed.decorator';

export class FindMarketOrOutcomeParticipantsDto extends PaginationOptionsDto {
  @IsOptional()
  @ApiPropertyOptional({
    description:
      'Specify the index of outcome if you intend to receive the list of outcome participants.',
    required: false,
  })
  @IsNumberStringTransformed()
  outcome?: number;
}
