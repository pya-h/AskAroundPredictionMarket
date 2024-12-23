import {
  Column,
  Entity,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { BaseEntity } from '../../core/base.entity';

@Entity('market_category')
@Tree('closure-table')
export class MarketCategory extends BaseEntity {
  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @Column({ name: 'description', nullable: true, default: null })
  description: string;

  @Column({ nullable: true })
  icon?: string;

  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId: number;

  @TreeParent({ onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: MarketCategory;

  @TreeChildren()
  subCategories: MarketCategory[];
}
