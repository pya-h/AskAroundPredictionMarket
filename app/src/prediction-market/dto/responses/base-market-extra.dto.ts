import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseConditionalToken } from '../../entities/bases/base-conditional-token.entity';
import { BasePredictionMarket } from '../../entities/bases/base-market.entity';

export class BasePredictionMarketExtraDto extends BasePredictionMarket {
  @ApiPropertyOptional({
    type: BaseConditionalToken,
    isArray: true,
    description: "List of market's to-be-created outcomes & sub-outcomes.",
  })
  outcomeTokens?: BaseConditionalToken[];
}

export class BasePredictionMarketExtraWithFlagDto extends BasePredictionMarketExtraDto {
  @ApiProperty({
    type: 'boolean',
    default: true,
    description:
      'Extra flag to distinguish deployed market from scheduled(reserved) markets [in client side].',
  })
  isReserved: boolean;
}
