import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { Chain } from './chain.entity';

@Entity()
export class MarketMakerFactory extends BaseEntity {
  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ name: 'address', type: 'varchar', length: 128 })
  address: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ type: 'jsonb' })
  abi: Record<string, unknown>[];

  @Column({ name: 'max_supported_outcomes', type: 'smallint', default: 2 })
  maxSupportedOutcomes: number;

  @Column({ type: 'varchar', length: 128, nullable: true, default: null })
  title?: string; // if the name is in short form like LMSR, this field can be used to hold the full name

  @Column({ nullable: true })
  description?: string;
}
