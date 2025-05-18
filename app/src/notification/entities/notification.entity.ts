import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BaseEntity } from '../../core/base.entity';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { NotificationTypeEnum } from '../enums/notification-type.enum';

@Entity()
export class Notification extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ nullable: true })
  title: string;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ nullable: true })
  body: string;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ nullable: true })
  icon: string;

  @ApiProperty({ type: Date, nullable: true })
  @Column({ nullable: true })
  time: Date;

  @ApiProperty({
    enum: NotificationTypeEnum,
    enumName: 'NotificationTypeEnum',
    nullable: true,
  })
  @Column({ nullable: true })
  type: string;

  @ApiProperty({
    type: 'boolean',
    description: 'Whether user has seen the notification or not.',
  })
  @Column({ default: false })
  read: boolean;

  @ApiPropertyOptional({ nullable: true, default: null })
  @Column({ type: 'jsonb', nullable: true, default: null })
  remarks?: Record<string, string>;
}
