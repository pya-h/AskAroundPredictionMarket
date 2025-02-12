import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionReceiptDto {
  @ApiProperty({ type: 'string' })
  blockHash: string;

  @ApiProperty({ type: 'number', description: 'or bigint sometimes.' })
  blockNumber: number;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  contractAddress?: string;

  @ApiProperty({ type: 'string' })
  cumulativeGasUsed: string;

  @ApiProperty({ type: 'string', example: '0xAddress' })
  from: string;

  @ApiProperty({ type: 'string' })
  gasPrice: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  blobGasUsed?: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  blobGasPrice?: string;

  @ApiProperty({ type: 'string' })
  gasUsed: string;

  @ApiProperty({ type: 'string' })
  hash: {
    type: 'string';
    example: '0x9619ffc8a3f7dace79730106a740c00c37dbc3935c9b75dcf233fa1d57b607ee';
  };

  @ApiProperty({ type: 'number' })
  index: 0;

  @ApiProperty({ type: 'object', isArray: true })
  logs: object[];

  @ApiProperty({
    type: 'string',
    example:
      '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
  })
  logsBloom: string;

  @ApiProperty({ type: 'number', example: 1 })
  status: number;

  @ApiProperty({ type: 'string', example: '0xAddress' })
  to: string;
}
