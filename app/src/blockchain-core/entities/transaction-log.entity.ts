import { ApiProperty } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BlockchainTransactionStatusEnum } from '../enums/transaction-status.enum';
import { User } from '../../user/entities/user.entity';
import { BlockchainTransactionTypeEnum } from '../enums/transaction-type.enum';
import { BaseEntity } from '../../core/base.entity';
import { CryptocurrencyToken } from './cryptocurrency-token.entity';

@Entity('blockchain_transaction_log')
export class BlockchainTransactionLog extends BaseEntity {
  @ApiProperty({
    type: 'number',
    description: 'Id of the user transaction is related to',
  })
  @Column({ name: 'user_id' })
  userId: number;

  @ApiProperty({
    type: User,
    description: 'The user transaction is related to',
  })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({
    type: 'string',
    example: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
  })
  @Column({ name: 'from', nullable: true })
  from: string;

  @ApiProperty({
    type: 'string',
    example: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
  })
  @Column({ name: 'to', nullable: true })
  to: string;

  @ApiProperty({ type: 'string' })
  @Column({ name: 'hash' })
  hash: string;

  @ApiProperty({ name: 'block_number' })
  @Column({ name: 'block_number', type: 'bigint' })
  blockNumber: bigint;

  @ApiProperty({ type: 'string' })
  @Column({ name: 'block_hash' })
  blockHash: string;

  @ApiProperty({ type: 'number', nullable: true })
  @Column({ name: 'token_id', nullable: true })
  tokenId: number;

  @ApiProperty({
    type: CryptocurrencyToken,
  })
  @ManyToOne(() => CryptocurrencyToken, {
    onDelete: 'NO ACTION',
    nullable: true,
  })
  @JoinColumn({ name: 'token_id' })
  token: CryptocurrencyToken;

  @ApiProperty({ type: 'number' })
  @Column({ type: 'double precision' })
  amount: number;

  @ApiProperty({
    enum: BlockchainTransactionStatusEnum,
    enumName: 'BlockchainTransactionStatusEnum',
    default: BlockchainTransactionStatusEnum.SUCCESSFUL,
  })
  @Column({ default: BlockchainTransactionStatusEnum.SUCCESSFUL.toString() })
  status: string;

  @ApiProperty({
    enum: BlockchainTransactionTypeEnum,
    enumName: 'BlockchainTransactionTypeEnum',
    description: 'The actual job the transaction has been mined for.',
  })
  @Column()
  type: string;

  @ApiProperty({
    description:
      'Extra data regarding the tx, such as description, marketId, etc.',
  })
  @Column({ type: 'jsonb', nullable: true, default: null })
  remarks: Record<string, unknown>;
}
