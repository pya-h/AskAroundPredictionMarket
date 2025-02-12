import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { Chain } from '../../blockchain-core/entities/chain.entity';
import { BaseEntity } from '../../core/base.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('contract')
export class ContractEntity extends BaseEntity {
  @ApiProperty({ type: 'string' })
  @Column({ type: 'varchar', length: 256 })
  name: string;

  @ApiProperty({ type: 'number', example: 1337 })
  @Column({ name: 'chain_id' })
  chainId: number;

  @ApiProperty({ type: Chain })
  @ManyToOne(() => Chain, { onDelete: 'NO ACTION' })
  @JoinColumn({ name: 'chain_id' })
  chain: Chain;

  @ApiProperty({
    type: 'string',
    example: '0x59d3631c86BbE35EF041872d502F218A39FBa150',
  })
  @Column({ name: 'address', type: 'varchar', length: 256 })
  address: string;

  @ApiProperty({
    type: 'json',
    description:
      'Contract ABI; Required so server can interact it in blockchain.',
    isArray: true,
  })
  @Column({ name: 'abi', type: 'jsonb', nullable: false })
  abi: Record<string, unknown>[];
}
