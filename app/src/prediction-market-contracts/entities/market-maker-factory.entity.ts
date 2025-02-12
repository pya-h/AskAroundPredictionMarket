import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Chain } from '../../blockchain-core/entities/chain.entity';
import { PredictionMarketTypesEnum } from '../enums/market-types.enum';
import { ContractEntity } from '../../blockchain-core/entities/contract.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('market_maker_factory')
export class MarketMakerFactory extends ContractEntity {
  // This entity holds the data of xMarketMakerFactory contracts, which will create xMarketMaker contracts.
  @ApiProperty({
    type: 'string',
    description: 'Indicating which type of market it will create.',
  })
  @Column({
    type: 'varchar',
    length: 16,
    default: PredictionMarketTypesEnum.LMSR.toString(),
    enum: PredictionMarketTypesEnum,
    enumName: 'PredictionMarketTypesEnum',
  })
  type: string;

  @ApiProperty({ type: 'number', default: 1337 })
  @Column({ name: 'chain_id' })
  chainId: number;

  @ApiProperty({
    type: Chain,
    description:
      'Chain which MarketMakerFactory contract is deployed on and will create markets on',
  })
  @ManyToOne(() => Chain)
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @Column({ name: 'mm_abi', type: 'jsonb' })
  marketMakerABI: Record<string, unknown>[];

  @Column({ name: 'mm_creation_event', type: 'varchar', length: 256 })
  marketMakerCreationEvent: string; // Event name which will be emitted when factory contract creates a Market Maker Contract

  @Column({ name: 'mm_address_field', type: 'varchar', length: 256 })
  marketMakerAddressField: string; // Name of the field inside creation log args, which holds the address of newly created MarketMaker Contract

  @ApiProperty({
    type: 'number',
    description: "0 if contract doesn't have any limit.",
  })
  @Column({ name: 'max_supported_outcomes', type: 'smallint', default: 2 })
  maxSupportedOutcomes: number;

  @ApiProperty({
    type: 'string',
    description: 'If you like to put a desired name on it.',
  })
  @Column({ type: 'varchar', length: 256, nullable: true, default: null })
  name: string;

  @ApiPropertyOptional({
    type: 'string',
  })
  @Column({ nullable: true })
  description?: string;
}
