import { Column, Entity } from 'typeorm';
import { CryptoTokenEnum } from '../enums/crypto-token.enum';
import { ContractEntity } from './contract.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('cryptocurrency_token')
export class CryptocurrencyToken extends ContractEntity {
  @ApiProperty({ type: 'string', example: 'ETH' })
  @Column({
    type: 'varchar',
    length: 16,
    default: CryptoTokenEnum.WETH9.toString(),
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  symbol: string;

  @ApiPropertyOptional({
    type: 'number',
    description:
      "The decimal value of the token in blockchain; Will be assigned automatically by server, calling token's decimals function.",
  })
  @Column({ name: 'decimals', default: null, type: 'smallint' })
  decimals?: number;

  @ApiProperty({
    type: 'json',
    description:
      'Contract ABI; Required so server can interact with token in blockchain.',
    isArray: true,
  })
  @Column({ type: 'jsonb', nullable: true })
  abi: Record<string, unknown>[];

  toString() {
    return this.symbol.toString();
  }
}
