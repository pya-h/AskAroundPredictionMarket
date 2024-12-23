import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Chain } from '../../blockchain-wallet/entities/chain.entity';
import { BaseEntity } from '../../core/base.entity';

@Entity('contract')
export class ContractEntity extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ name: 'address', type: 'varchar', length: 256 })
  address: string;

  @Column({ name: 'abi', type: 'jsonb', nullable: false })
  abi: Record<string, unknown>[];
}
