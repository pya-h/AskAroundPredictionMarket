import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class UploadAndUpdateMarketCategoryIconDto {
  @ApiPropertyOptional({
    description:
      'Providing categoryId will automatically update the category icon; No need to feed the returned filename to edit category endpoint manually.',
    default: null,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!isNaN(value)) {
      return +value;
    }
    return value;
  })
  @IsInt({ message: 'Id of the category you wish to change its icon.' })
  @IsPositive({
    message:
      'If you intend to directly update category icon, you must provide a valid categoryId, which needs to be a positive integer.',
  })
  categoryId?: number;
}
