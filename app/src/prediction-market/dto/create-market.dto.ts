import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { CryptoTokenEnum } from '../../blockchain-core/enums/crypto-token.enum';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';
import { ContainsUniqueItems } from '../../core/validators/contains-unique-items.validator';

export class NewPredictionMarketOutcomeInfoDto {
  @ApiProperty({
    type: 'string',
    example: 'Yes',
  })
  @IsNotEmpty({ message: 'Outcomes must have title.' })
  @IsString()
  @MaxLength(64, {
    message: 'Outcome title must not be longer than $constraint1 characters.',
  })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  title: string;

  @ApiPropertyOptional({
    description: 'Describer of the outcome.',
    required: false,
    default: null,
  })
  @IsOptional()
  @IsString()
  @MaxLength(256, {
    message:
      'Outcome description must not be longer than $constraint1 characters.',
  })
  description?: string;

  @ApiPropertyOptional({
    description:
      'Minio filename of the uploaded icon for the outcome; If it has any.',
    nullable: true,
  })
  @IsOptional()
  @IsString({ message: 'Enter the uploaded outcome icon filename.' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  icon?: string;
}

export class CreatePredictionMarketDto {
  @ApiProperty({
    description: 'The Question',
  })
  @IsNotEmpty({ message: 'Question can not be empty' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  question: string;

  @ApiProperty({
    type: NewPredictionMarketOutcomeInfoDto,
    description: 'Outcomes and their details.',
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NewPredictionMarketOutcomeInfoDto)
  @ArrayMinSize(2, { message: 'At least two outcomes are expected.' })
  @ContainsUniqueItems({
    message:
      'Market outcomes must be unique, meaning your input title fields are not unique!',
    targetField: 'title',
  })
  outcomes: NewPredictionMarketOutcomeInfoDto[];

  @ApiProperty({
    description:
      'The category of the market, specifying which topic is market question about. null means General',
  })
  @IsNotEmpty({ message: 'The id of the market question category.' })
  @IsInt({ message: 'Category Id must be a positive integer!' })
  @IsPositive({ message: 'Category Id must be a positive integer!' })
  categoryId: number;

  @ApiProperty({
    description:
      'The starting liquidity, specifying the initial amount of collateral token which is going to be invested on the market. This also specifies the initial price of outcomes.',
  })
  @IsNotEmpty({ message: 'Initial liquidity of the market must be specified.' })
  @IsNumber()
  @IsPositive()
  initialLiquidity: number;

  @ApiPropertyOptional({ description: 'Market trade fee in percent (%)' })
  @IsOptional()
  @IsNumber()
  @Min(0, { message: 'fee must be a non-negative percentage!' })
  @Max(99.999999, {
    message: `fee must be smaller than 100.`,
  })
  fee?: number;

  @Type(() => Date)
  @IsDate()
  @ApiPropertyOptional({
    description: 'In case market should start at future.',
    required: false,
  })
  @IsOptional()
  startAt?: Date;

  @Type(() => Date)
  @IsDate()
  @ApiProperty({
    description:
      'Closing date of the market and start of the resolving process.',
    required: true,
  })
  resolveAt: Date;

  @ApiPropertyOptional({
    description:
      'Special creatorId, in case requester wants to specify another user as creator.',
    required: false,
  })
  @IsInt({ message: 'creatorId must be an integer!' })
  @IsOptional()
  creatorId?: number;

  @ApiPropertyOptional({
    description: 'Extra description for the market, if required.',
    required: false,
    default: null,
  })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Market Image minio filename.',
    required: false,
    default: null,
  })
  @IsOptional()
  @IsString({ message: 'Specify a valid image filename.' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  image?: string;

  @ApiProperty({
    description: 'Market data reference url.',
    required: true,
  })
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({
    description:
      'The subject of the question, an abbreviation for the market question indeed.',
    required: false,
    default: null,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.trim();
    }
  })
  subject?: string;

  @ApiPropertyOptional({
    description:
      'Set this when market needs to use an oracle other than the default oracle.',
    required: false,
    default: null,
  })
  @IsInt({ message: 'oracleId must be an integer!' })
  @IsOptional()
  oracleId?: number;

  @ApiPropertyOptional({
    description:
      "Set this when market uses a collateral token other than OmenArena's default collateral token.",
    required: false,
    default: null,
  })
  @ApiPropertyOptional({
    description:
      'Type of token which market liquidity is provided with; Now only weth9 is supported, other tokens contract not provided yet.',
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
    required: false,
    default: CryptoTokenEnum.WETH9.toString(),
  })
  @IsOptional()
  @IsEnumDetailed(CryptoTokenEnum, 'collateralToken')
  collateralToken?: string;
}
