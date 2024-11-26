import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { Chain } from './chain.entity';

@Entity('market_maker_factory')
export class MarketMakerFactory extends BaseEntity {
  // This entity holds the data of xMarketMakerFactory contracts, which will create xMarketMaker contracts.
  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ name: 'address', type: 'varchar', length: 128 })
  address: string;

  @Column({ name: 'chain_id' })
  chainId: number;

  @ManyToOne(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ name: 'factory_abi', type: 'jsonb' })
  factoryABI: Record<string, unknown>[];

  @Column({ name: 'mm_abi', type: 'jsonb' })
  marketMakerABI: Record<string, unknown>[];

  @Column({ name: 'mm_creation_event', type: 'varchar', length: 256 })
  marketMakerCreationEvent: string; // Event name which will be emitted when factory contract creates a Market Maker Contract

  @Column({ name: 'mm_address_field', type: 'varchar', length: 256 })
  marketMakerAddressField: string; // Name of the field inside creation log args, which holds the address of newly created MarketMaker Contract

  @Column({ name: 'max_supported_outcomes', type: 'smallint', default: 2 })
  maxSupportedOutcomes: number;

  @Column({ type: 'varchar', length: 128, nullable: true, default: null })
  title?: string; // if the name is in short form like LMSR, this field can be used to hold the full name

  @Column({ nullable: true })
  description?: string;
}
