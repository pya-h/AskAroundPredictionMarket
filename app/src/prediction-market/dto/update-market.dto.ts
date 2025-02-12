import { OmitType } from '@nestjs/swagger';
import { UpdateReservedPredictionMarketDto } from './update-reserved-market.dto';

export class UpdatePredictionMarketDto extends OmitType(
  UpdateReservedPredictionMarketDto,
  [
    'collateralToken',
    'initialLiquidity',
    'oracleId',
    'outcomes',
    'question',
    'startAt',
    'marketType',
  ],
) {}
