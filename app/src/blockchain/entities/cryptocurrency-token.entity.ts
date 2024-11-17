import { Column, Entity, JoinColumn, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { Chain } from './chain.entity';

@Entity()
export class CryptocurrencyToken extends BaseEntity {
  @Column({ type: 'varchar', length: 64 })
  name: string;

  @Column({ type: 'varchar', length: 16 })
  symbol: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToMany(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column()
  address: string;

  @Column({ nullable: true })
  icon?: string;
}
