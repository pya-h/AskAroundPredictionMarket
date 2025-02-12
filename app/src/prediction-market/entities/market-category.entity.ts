import {
  Column,
  Entity,
  JoinColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm';
import { BaseEntity } from '../../core/base.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

@Entity('market_category')
@Tree('closure-table')
export class MarketCategory extends BaseEntity {
  @ApiProperty({ type: 'string' })
  @Column({ name: 'name', type: 'varchar', length: 256 })
  name: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ name: 'description', nullable: true, default: null })
  description?: string;

  @ApiPropertyOptional({ type: 'string', nullable: true })
  @Column({ nullable: true })
  icon?: string; // TODO: Add option to upload category icon too.

  @ApiPropertyOptional({ type: 'number', nullable: true })
  @Column({ name: 'parent_id', type: 'integer', nullable: true })
  parentId?: number;

  @ApiPropertyOptional({
    type: MarketCategory,
    nullable: true,
    example: {
      id: 2,
      createdAt: '2025-01-06T22:36:36.737Z',
      updatedAt: '2025-01-06T22:36:36.737Z',
      deletedAt: null,
      name: 'Sport',
      description:
        'Includes predictions related to sports events, teams, and athletes.',
      icon: null,
      parentId: null,
    },
  })
  @TreeParent({ onDelete: 'SET NULL' })
  @JoinColumn({ name: 'parent_id' })
  parent?: MarketCategory;

  @ApiProperty({
    type: MarketCategory,
    isArray: true,
    example: [
      {
        id: 11,
        createdAt: '2025-01-06T22:36:36.737Z',
        updatedAt: '2025-01-06T22:36:36.737Z',
        deletedAt: null,
        name: 'Football',
        description: null,
        icon: null,
        parentId: 2,
        subCategories: [],
      },
      {
        id: 12,
        createdAt: '2025-01-06T22:36:36.737Z',
        updatedAt: '2025-01-06T22:36:36.737Z',
        deletedAt: null,
        name: 'Basketball',
        description: null,
        icon: null,
        parentId: 2,
        subCategories: [],
      },
    ],
  })
  @TreeChildren()
  subCategories: MarketCategory[];
}
