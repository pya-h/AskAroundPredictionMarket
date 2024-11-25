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

  @Column({ nullable: true })
  icon?: string;
}
