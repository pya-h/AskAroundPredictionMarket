import { ApiProperty } from '@nestjs/swagger';
import { TransactionReceiptDto } from 'src/blockchain-core/dtos/response/transaction-receipt.dto';

export class RedeemResultDto {
  @ApiProperty({ type: TransactionReceiptDto })
  receipt: TransactionReceiptDto;
}
