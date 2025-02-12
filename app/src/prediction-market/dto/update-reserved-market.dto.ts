import { ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  CreatePredictionMarketDto,
  NewPredictionMarketOutcomeInfoDto,
} from './create-market.dto';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PredictionMarketTypesEnum } from 'src/prediction-market-contracts/enums/market-types.enum';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { ContainsUniqueItems } from 'src/core/validators/contains-unique-items.validator';

export class UpdateReservedPredictionMarketDto extends OmitType(
  CreatePredictionMarketDto,
  [
    'categoryId',
    'question',
    'outcomes',
    'resolveAt',
    'initialLiquidity',
    'reference',
  ],
) {
  @ApiPropertyOptional({
    description: 'The Question',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  question?: string;

  @ApiPropertyOptional({
    type: NewPredictionMarketOutcomeInfoDto,
    description:
      'Outcomes and their details; Setting this will remove original [reserved] outcomes data.',
    isArray: true,
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewPredictionMarketOutcomeInfoDto)
  @ArrayMinSize(2, { message: 'At least two outcomes are expected.' })
  @ContainsUniqueItems({
    message:
      'Market outcomes must be unique, meaning your input title fields are not unique!',
    targetField: 'title',
  })
  outcomes?: NewPredictionMarketOutcomeInfoDto[];

  @ApiPropertyOptional({
    description:
      'The category of the market, specifying which topic is market question about. null means General',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Category Id must be a positive integer!' })
  @IsPositive({ message: 'Category Id must be a positive integer!' })
  categoryId?: number;

  @ApiPropertyOptional({
    description:
      'The starting liquidity, specifying the initial amount of collateral token which is going to be invested on the market. This also specifies the initial price of outcomes.',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  initialLiquidity?: number;

  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({
    description:
      'Closing date of the market and start of the resolving process.',
    required: false,
  })
  @IsOptional()
  resolveAt?: Date;

  @ApiPropertyOptional({
    enum: PredictionMarketTypesEnum,
    enumName: 'PredictionMarketTypesEnum',
    description: 'Algorithm of prediction market',
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketTypesEnum, 'market type')
  marketType?: PredictionMarketTypesEnum;

  @ApiPropertyOptional({
    description: 'Market data reference url.',
    required: false,
    default: null,
  })
  @IsOptional()
  reference?: string;
}
