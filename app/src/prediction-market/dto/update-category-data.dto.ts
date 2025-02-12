import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import { CreatePredictionMarketCategoryDto } from './create-category.dto';

export class UpdatePredictionMarketCategoryDto extends OmitType(
  CreatePredictionMarketCategoryDto,
  ['name', 'parentId'],
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

  @ApiPropertyOptional({
    description:
      'The new parent id of this category; Set this to null if you intend to convert the category to a primary one.',
    default: undefined,
  })
  @IsOptional()
  @IsInt({
    message: 'Id of the new parent category must be a positive integer.',
  })
  @IsPositive({
    message: 'Id of the new parent category must be a positive integer.',
  })
  parentId?: number;
}
