import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { PaginationOptionsDto } from 'src/core/dtos/pagination-options.dto';

export class GetMarketsQuery extends PaginationOptionsDto {
  @IsOptional()
  @IsNumberString()
  @ApiProperty({
    description:
      'Retrieve markets by a specific category, by providing the id of that category.',
    required: false,
  })
  category?: number;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Retrieve markets which have a specific subject.',
    required: false,
  })
  subject?: string;
}
