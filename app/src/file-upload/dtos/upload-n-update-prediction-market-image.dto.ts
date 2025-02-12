import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';
import { IsBooleanValue } from 'src/core/decorators/is-boolean-value.decorator';

export class UploadAndUpdatePredictionMarketImageDto {
  @ApiPropertyOptional({
    description:
      'Providing marketId will automatically update the market image; No need to feed the returned filename to edit market endpoint manually.',
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
  marketId?: number;

  @ApiPropertyOptional({
    description:
      'Specify whether market is reserved or not; Notice that Reserved markets data is held separately so do not mistake IDs.',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBooleanValue()
  reserved?: boolean;
}
