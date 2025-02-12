import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { BlockchainWallet } from '../../blockchain-core/entities/blockchain-wallet.entity';
import { ContractEntity } from '../../blockchain-core/entities/contract.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OracleTypesEnum {
  DECENTRALIZED = 'decentralized',
  CENTRALIZED = 'centralized',
}

@Entity()
export class Oracle extends BaseEntity {
  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ nullable: true })
  icon?: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ nullable: true })
  description?: string;

  @ApiProperty({
    type: 'string',
    example: OracleTypesEnum.CENTRALIZED.toString(),
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: OracleTypesEnum.CENTRALIZED.toString(),
    enum: OracleTypesEnum,
    enumName: 'OracleTypesEnum',
  })
  type: string;

  // centralized oracle
  @ApiPropertyOptional({
    type: 'number',
    nullable: true,
    description:
      'If the oracle is centralized, this is its BlockchainWallet id',
  })
  @Column({
    name: 'account_id',
    type: 'integer',
    nullable: true,
    default: null,
  })
  accountId?: number | null;

  @ApiPropertyOptional({
    type: BlockchainWallet,
    nullable: true,
    description:
      'If the oracle is centralized, this is its BlockchainWallet data', // TODO: add the ExcludePrivateInfo decorator to project and use it for this field, to hide secret.
  })
  @ManyToOne(() => BlockchainWallet, { eager: true, onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'account_id' })
  account?: BlockchainWallet | null;

  // decentralized oracles:
  @ApiPropertyOptional({
    type: 'number',
    nullable: true,
    description:
      'If the oracle is decentralized, this is its ContractEntity id',
  })
  @Column({
    name: 'contract_id',
    type: 'integer',
    nullable: true,
    default: null,
  })
  contractId?: number | null;

  @ApiPropertyOptional({
    type: BlockchainWallet,
    nullable: true,
    description: 'If the oracle is decentralized, this is its Contract data',
  })
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
