import { Column, Entity } from 'typeorm';
import { CryptoTokenEnum } from '../../prediction-market-contracts/enums/crypto-token.enum';
import { ContractEntity } from '../../prediction-market-contracts/entities/contract.entity';

@Entity('cryptocurrency_token')
export class CryptocurrencyToken extends ContractEntity {
  @Column({
    type: 'varchar',
    length: 16,
    default: CryptoTokenEnum.WETH9.toString(),
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  symbol: string;

  @Column({ name: 'decimals', default: null, type: 'smallint' })
  decimals?: number;

  @Column({ type: 'jsonb', nullable: true })
  abi: Record<string, unknown>[];
}
