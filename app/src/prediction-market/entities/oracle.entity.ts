import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { Chain } from '../../blockchain/entities/chain.entity';
import { User } from '../../user/entities/user.entity';

@Entity()
export class Oracle extends BaseEntity {
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain)
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

  @Column({
    name: 'manager_id',
    type: 'integer',
    nullable: true,
    default: null
  })
  managerId: number | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'manager_id' })
  manager: User | null;

}
