import { ApiProperty } from '@nestjs/swagger';
import { BlockchainTransactionLog } from 'src/blockchain-core/entities/transaction-log.entity';

export class PredictionMarketFeeCollectionResultDto {
  @ApiProperty({
    type: BlockchainTransactionLog,
    nullable: true,
    description:
      'Collect fee result as a transaction; would be null in case there was no fees to collect!',
  })
  tx: BlockchainTransactionLog | null;

  @ApiProperty({
    type: 'string',
    description: 'Collecting result in short text,',
    example: 'OK',
  })
  result: string;

  @ApiProperty({
    type: 'number',
    description: 'Market fee rate in percent.',
  })
  feePercent: number;
}
