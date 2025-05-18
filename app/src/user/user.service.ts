import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserNotificationSettings } from './entities/user-notification-settings.entity';
import { UpdateFcmTokenDto } from './dtos/update-fcm-token.dto';
import { UpdateNotificationSettingsDto } from './dtos/update-notification-settings.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserNotificationSettings)
    private readonly userNotificationSettingsRepository: Repository<UserNotificationSettings>,
  ) {}

  // Notice: Password must be hashed. This is just temp.
  async create(username: string, email: string, password: string) {
    const user: User = await this.userRepository.save(
      this.userRepository.create({
        username,
        password,
        email,
      }),
    );

    const userNotificationSettings =
      this.userNotificationSettingsRepository.create({
        userId: user.id,
      });
    user.notificationSettings = userNotificationSettings;
    await this.userNotificationSettingsRepository.save(
      userNotificationSettings,
    );

    return user;
  }

  createDirectly(username: string, email: string, password: string) {
    return this.userRepository.save({ username, password, email });
  }

  findOne(id: number, shouldThrow: boolean = false) {
    if (!id) {
      if (shouldThrow) {
        throw new NotFoundException('User not found!');
      }
      return null;
    }
    return this.userRepository.findOneBy({ id });
  }

  find(searchParam: Partial<User>): Promise<User[]> {
    const { username, email } = searchParam;
    if (username) return this.userRepository.findBy({ username });
    if (email) return this.userRepository.findBy({ email });

    return Promise.resolve([]);
  }

  async updateById(id: number, fields: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return this.update(user, fields);
  }

  update(user: User, fields: Partial<User>) {
    Object.assign(user, fields);
    return this.userRepository.save(user);
  }

  async removeById(id: number) {
    // Other approach is using delete. That does the job directly but as mentioned in update section about .update,
    // this delete method doesn't run Hooks too.
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.userRepository.remove(user); // remove & save and maybe run some hooks
  }
  getUsersCount() {
    return this.userRepository.count();
  }

  async updateFcmToken(user: User, updateFcmTokenDto: UpdateFcmTokenDto) {
    await this.userRepository.update(
      { id: user.id },
      { fcmToken: updateFcmTokenDto.fcmToken },
    );
  }

  async getUserNotificationSetting(user: User) {
    const notificationSettings =
      await this.userNotificationSettingsRepository.findOneBy({
        userId: user.id,
      });
    return (
      notificationSettings ??
      (await this.userNotificationSettingsRepository.save(
        this.userNotificationSettingsRepository.create({ userId: user.id }),
      ))
    );
  }

  findBatch(
    propertyList: (number | string)[],
    field: 'id' | 'email' | 'username' = 'id',
  ) {
    return this.userRepository.find({ where: { [field]: In(propertyList) } });
  }

  async updateUserNotificationSettings(
    user: User,
    updateNotificationSettingsDto: UpdateNotificationSettingsDto,
  ) {
    if (!user.notificationSettings) {
      user.notificationSettings = await this.getUserNotificationSetting(user);
    }

    if (!Object.values(updateNotificationSettingsDto)?.length) {
      throw new BadRequestException('Nothing changed!');
    }

    Object.assign(user.notificationSettings, updateNotificationSettingsDto);

    return this.userNotificationSettingsRepository.save(
      user.notificationSettings,
    );
  }
}
