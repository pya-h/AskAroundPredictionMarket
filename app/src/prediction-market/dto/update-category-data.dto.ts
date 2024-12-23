import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreatePredictionMarketCategoryDto } from './create-category.dto';

export class UpdatePredictionMarketCategoryDto extends OmitType(
  CreatePredictionMarketCategoryDto,
  ['name'],
) {
  @ApiPropertyOptional({
    description: 'Category Name',
  })
  @IsString({ message: 'Category name must be a valid string.' })
  @MaxLength(256, {
    message:
      'Category name must not be too long. Please select a name with at least $constraint1 characters.',
  })
  @IsOptional()
  name?: string;
}
