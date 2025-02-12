import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { IsBooleanValue } from 'src/core/decorators/is-boolean-value.decorator';

export class UploadAndUpdateMarketOutcomeIconDto {
  @ApiPropertyOptional({
    description:
      'Providing outcomeId will automatically update the outcome icon; No need to feed the returned filename to edit outcome endpoint manually.',
    default: null,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!isNaN(value)) {
      return +value;
    }
    return value;
  })
  @IsInt({ message: 'Id of the outcome you wish to change its icon.' })
  @IsPositive({
    message:
      'If you intend to directly update outcome icon, you must provide a valid outcomeId, which needs to be a positive integer.',
  })
  outcomeId?: number;

  @ApiPropertyOptional({
    description:
      'Specify whether the outcome belongs to a Reserved/Pending market or not; Notice that Reserved markets data & their outcome data is held separately so do not mistake IDs.',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBooleanValue()
  reserved?: boolean;
}
