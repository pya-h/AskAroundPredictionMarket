import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../core/base.entity';

@Entity('market_category')
export class MarketCategory extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 64 })
  name: string;

  @Column({ name: 'title', type: 'varchar', length: 256 })
  title: string;

  @Column({ name: 'description', nullable: true, default: null })
  description: string;

  @Column({ nullable: true })
  icon?: string;
}
