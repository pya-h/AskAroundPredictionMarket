import { Column, Entity, JoinColumn, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { Chain } from '../../blockchain/entities/chain.entity';

@Entity()
export class Oracle extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToMany(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column()
  address: string;

  @Column({ type: 'jsonb' })
  abi: Record<string, unknown>[];

  @Column({ nullable: true })
  icon?: string;

  @Column({ nullable: true })
  description?: string;
}
