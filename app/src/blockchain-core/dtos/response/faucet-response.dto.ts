import { ApiProperty } from '@nestjs/swagger';
import { TransactionReceipt } from 'ethers';
import { TransactionReceiptDto } from './transaction-receipt.dto';
import { Chain } from 'src/blockchain-core/entities/chain.entity';

export class FaucetResponseDto {
  @ApiProperty({
    description:
      "The balance of the requesting user after. It's string to prevent number overflow",
  })
  balance: string;

  @ApiProperty({
    type: Chain,
    description: 'Chain which transaction has happened on',
  })
  chain: Chain;

  @ApiProperty({
    description: 'Symbol of the received token [chains native token]',
    type: 'string',
  })
  token: string;

  @ApiProperty({
    description: 'Amount of tokens received.',
    type: 'number',
  })
  amount: number | string;

  @ApiProperty({
    description: 'Numeric string; Amount of tokens received in wei.',
    type: 'string',
  })
  amountInWei: string;

  @ApiProperty({
    description: 'Receipt of the transaction',
    type: TransactionReceiptDto,
  })
  receipt: TransactionReceipt;
}
