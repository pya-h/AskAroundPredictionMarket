import { Entity, Column, OneToOne } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../core/base.entity';
import { ApiProperty } from '@nestjs/swagger';
import { UserNotificationSettings } from './user-notification-settings.entity';

@Entity()
export class User extends BaseEntity {
  @ApiProperty({ type: 'string' })
  @Column({ unique: true })
  username: string;

  @ApiProperty({ type: 'string' })
  @Column()
  email: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({
    type: UserNotificationSettings,
    description: "User's push notification configurations.",
  })
  @OneToOne(
    () => UserNotificationSettings,
    (notificationSettings) => notificationSettings.user,
    {
      onDelete: 'SET NULL',
      eager: true,
    },
  )
  notificationSettings: UserNotificationSettings;

  @ApiProperty({
    type: 'string',
    description:
      "User's fcm token of the device; Must be set in order to receive notification by users.",
  })
  @Column({ name: 'fcm_token', nullable: true })
  fcmToken: string;
}
