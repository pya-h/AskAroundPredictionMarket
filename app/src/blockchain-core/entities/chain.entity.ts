import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { CryptoTokenEnum } from '../enums/crypto-token.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity()
export class Chain extends BaseEntity {
  @ApiProperty({ type: 'number' })
  @PrimaryColumn()
  id: number;

  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 32 })
  name: string;

  @ApiProperty({ type: 'string' })
  @Column({ name: 'rpc_url' })
  rpcUrl: string;

  @ApiProperty({ type: 'string', example: 'wss://rpc.url' })
  @Column({ name: 'ws_rpc_url', nullable: true, default: null })
  wsRpcUrl: string;

  @ApiProperty({ type: 'string', example: CryptoTokenEnum.ETH.toString() })
  @Column({
    name: 'native_token',
    type: 'varchar',
    length: 16,
    default: CryptoTokenEnum.ETH.toString(),
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  nativeToken: string;

  @ApiPropertyOptional({ type: 'string' })
  @Column({ nullable: true })
  icon?: string;

  @Column({
    name: 'block_process_offset',
    type: 'bigint',
    nullable: true,
    default: null,
  })
  blockProcessOffset: bigint;

  @Column({
    name: 'block_process_range',
    type: 'smallint',
    default: 50,
  })
  blockProcessRange: number;

  get webSocketRpcUrl() {
    return this.wsRpcUrl || this.rpcUrl.replace('http', 'ws');
  }

  override toString() {
    return this.name ?? this.id.toString();
  }
}
