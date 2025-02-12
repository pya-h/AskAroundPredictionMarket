import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePredictionMarketCategoryDto {
  @ApiProperty({
    description: 'Category Name',
  })
  @IsNotEmpty({ message: 'Category must have a name to display' })
  @IsString({ message: 'Category name must be a valid string.' })
  @MaxLength(256, {
    message:
      'Category name must not be too long. Please select a name with at least $constraint1 characters.',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the new category',
  })
  @IsOptional()
  @IsString({ message: 'Category description must be a valid string.' })
  description?: string;

  @ApiPropertyOptional({
    description:
      'The Minio filename of the uploaded category icon you wish to be shown beside category name.',
  })
  @IsOptional()
  @IsString({ message: 'Specify a returned filename from upload endpoint.' })
  icon?: string;

  @ApiPropertyOptional({
    description: 'The id of the parent category, if this a sub category',
    default: null,
  })
  @IsOptional()
  @IsInt({ message: 'Id of the parent category must be a positive integer.' })
  @IsPositive({
    message: 'Id of the parent category must be a positive integer.',
  })
  parentId?: number;
}
