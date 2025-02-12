import { ApiProperty } from '@nestjs/swagger';
import { TransactionReceiptDto } from '../../../blockchain-core/dtos/response/transaction-receipt.dto';

export class OutcomeTradeResponseDto {
  @ApiProperty({
    description:
      'Amount purchased/sold in this trade; Useful in trade by payment-input case.',
    type: 'number',
  })
  amount: number;

  @ApiProperty({
    description: 'Blockchain transaction receipt.',
    type: TransactionReceiptDto,
  })
  receipt: TransactionReceiptDto;
}
