import { ApiProperty, OmitType } from '@nestjs/swagger';
import { CryptocurrencyToken } from 'src/blockchain-core/entities/cryptocurrency-token.entity';
import { ConditionalToken } from 'src/prediction-market/entities/conditional-token.entity';

class PaymentTokenDto extends OmitType(CryptocurrencyToken, [
  'abi',
  'chain',
  'chainId',
  'createdAt',
  'deletedAt',
  'updatedAt',
]) {}

export class TotalPerOutcomeTradeStatisticsDto extends OmitType(
  ConditionalToken,
  [
    'id',
    'market',
    'predictionOutcome',
    'predictionOutcomeId',
    'deletedAt',
    'updatedAt',
  ],
) {
  @ApiProperty({ type: 'number' })
  outcomeId: number;

  @ApiProperty({ type: 'string' })
  title: string;

  @ApiProperty({ type: 'string' })
  icon: string;

  @ApiProperty({
    type: 'number',
    description:
      'Total amount of outcomes traded upon these specific participations.',
  })
  totalAmount: number;

  @ApiProperty({
    type: 'number',
    description:
      'Total amount of payment token user has paid, on these specified participations.',
  })
  totalPayments: number;

  @ApiProperty({
    type: 'number',
    description: 'Chain which this amount of payment token is traded on.',
  })
  paymentChainId: number;

  @ApiProperty({
    description: 'Token which these trades are made using it.',
  })
  paymentToken: PaymentTokenDto;
}
