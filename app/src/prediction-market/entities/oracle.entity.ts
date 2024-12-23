import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { BlockchainWallet } from '../../blockchain-wallet/entities/blockchain-wallet.entity';
import { ContractEntity } from '../../prediction-market-contracts/entities/contract.entity';

export enum OracleTypesEnum {
  DECENTRALIZED = 'decentralized',
  CENTRALIZED = 'centralized',
}

@Entity()
export class Oracle extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  description?: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: OracleTypesEnum.CENTRALIZED.toString(),
    enum: OracleTypesEnum,
    enumName: 'OracleTypesEnum',
  })
  type: string;

  // centralized oracle
  @Column({
    name: 'account_id',
    type: 'integer',
    nullable: true,
    default: null,
  })
  accountId?: number | null;

  @ManyToOne(() => BlockchainWallet, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'account_id' })
  account?: BlockchainWallet | null;

  // decentralized oracles:
  @Column({
    name: 'contract_id',
    type: 'integer',
    nullable: true,
    default: null,
  })
  contractId?: number | null;

  @ManyToOne(() => ContractEntity, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'contract_id' })
  contract?: ContractEntity | null;

  get address() {
    return this.type !== OracleTypesEnum.DECENTRALIZED.toString()
      ? this.account?.address
      : this.contract?.address;
  }

  static getTypeRelatedFieldName(type: OracleTypesEnum) {
    return type !== OracleTypesEnum.DECENTRALIZED ? 'account' : 'contract';
  }

  get typeRelatedFieldName() {
    return Oracle.getTypeRelatedFieldName(this.type as OracleTypesEnum);
  }
}
