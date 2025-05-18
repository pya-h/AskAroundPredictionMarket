import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';
import { GetConditionalTokenBalanceQuery } from './get-ct.dto';
import { PredictionMarketTradeModesEnum } from '../enums/market-participation.enums';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';

export class GetConditionalTokenPriceQuery extends GetConditionalTokenBalanceQuery {
  @IsOptional()
  @IsNumberString()
  @ApiPropertyOptional({
    description: 'Amount of outcome user intends to know its price',
    required: false,
    default: '1',
  })
  amount?: string;

  @ApiPropertyOptional({
    enum: PredictionMarketTradeModesEnum,
    enumName: 'PredictionMarketTradeModesEnum',
    description:
      'Specify wether you want the purchasing price or selling price.',
    default: PredictionMarketTradeModesEnum.BUY,
    required: false,
  })
  @IsOptional()
  @IsEnumDetailed(PredictionMarketTradeModesEnum, 'mode')
  mode?: PredictionMarketTradeModesEnum;
}
