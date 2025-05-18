import { IsNumberString, IsOptional, IsPositive } from 'class-validator';
import { PaginationOptionsDto } from '../../core/dtos/pagination-options.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CryptoTokenEnum } from '../enums/crypto-token.enum';
import { IsEnumDetailed } from 'src/core/decorators/is-enum-detailed.decorator';
import { IsNumberStringTransformed } from 'src/core/decorators/is-number-string-transformed.decorator';
import { BlockchainTransactionStatusEnum } from '../enums/transaction-status.enum';
import { BlockchainTransactionTypeEnum } from '../enums/transaction-type.enum';
import { BlockchainTransactionSortOptionsEnum } from '../enums/transaction-sort-options.enum';
import { IsBooleanValue } from 'src/core/decorators/is-boolean-value.decorator';

export class GetBlockchainTransactionHistoryOptionsDto extends PaginationOptionsDto {
  @ApiPropertyOptional({
    description: 'The cryptocurrency which users wish to get its balance.',
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  @IsOptional()
  @IsEnumDetailed(CryptoTokenEnum, 'token')
  token?: CryptoTokenEnum;

  @ApiPropertyOptional({
    description: 'Filter transactions by specific chain id',
  })
  @IsNumberStringTransformed()
  @IsOptional()
  chain?: number;

  @ApiPropertyOptional({
    description: 'Filter transactions by a specific block number',
  })
  @IsOptional()
  @IsNumberString()
  block?: string;

  @ApiPropertyOptional({
    description: 'Filter transactions with amounts larger than this',
  })
  @IsOptional()
  @IsNumberStringTransformed()
  @IsPositive()
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter transactions with amounts smaller than this',
  })
  @IsOptional()
  @IsNumberStringTransformed()
  @IsPositive()
  maxAmount?: number;

  @ApiPropertyOptional({
    enum: BlockchainTransactionStatusEnum,
    enumName: 'BlockchainTransactionStatusEnum',
    default: BlockchainTransactionStatusEnum.PENDING,
    description: 'Filter transactions which are on a specific status',
  })
  @IsEnumDetailed(BlockchainTransactionStatusEnum, 'status')
  @IsOptional()
  status?: BlockchainTransactionStatusEnum;

  @ApiPropertyOptional({
    enum: BlockchainTransactionTypeEnum,
    enumName: 'BlockchainTransactionTypeEnum',
    default: BlockchainTransactionTypeEnum.TRADE_BUY,
    description: 'Filter specific transaction types',
  })
  @IsEnumDetailed(BlockchainTransactionTypeEnum, 'type')
  @IsOptional()
  type?: BlockchainTransactionTypeEnum;

  @ApiPropertyOptional({
    description: 'Filter transactions related to specific market',
  })
  @IsNumberStringTransformed()
  @IsOptional()
  marketId?: number;

  @ApiPropertyOptional({
    enum: BlockchainTransactionSortOptionsEnum,
    enumName: 'BlockchainTransactionSortOptionsEnum',
    default: BlockchainTransactionSortOptionsEnum.DATE,
  })
  @IsOptional()
  @IsEnumDetailed(BlockchainTransactionSortOptionsEnum, 'sort')
  sort?: BlockchainTransactionSortOptionsEnum;

  @ApiPropertyOptional({
    description: 'Revert list order; Default order is ascending.',
  })
  @IsOptional()
  @IsBooleanValue()
  descending?: boolean;
}
