import { IsNumberString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationOptionsDto {
  @IsOptional()
  @IsNumberString()
  @ApiProperty({
    description: 'The index of item to start fetching items from.',
    required: false,
  })
  skip?: number;

  @IsOptional()
  @IsNumberString()
  @ApiProperty({
    description: 'Max number of items to be fetched.',
    required: false,
  })
  take?: number;
}
