import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../user/entities/user.entity';
import { WebPushNotificationService } from './web-push-notification.service';
import { UserNotificationSettings } from '../user/entities/user-notification-settings.entity';
import { EmailModule } from 'src/email/email.module';
import { ConfigModule } from 'src/config/config.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([Notification, User, UserNotificationSettings]),
    EmailModule,
  ],
  providers: [WebPushNotificationService],
  exports: [WebPushNotificationService],
})
export class NotificationModule {}
