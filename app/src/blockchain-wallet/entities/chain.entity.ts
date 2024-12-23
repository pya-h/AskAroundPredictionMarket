import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';

@Entity()
export class Chain extends BaseEntity {
  @PrimaryColumn()
  id: number;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ name: 'rpc_url' })
  rpcUrl: string;

  @Column({ name: 'ws_rpc_url', nullable: true, default: null })
  wsRpcUrl: string;

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
}
