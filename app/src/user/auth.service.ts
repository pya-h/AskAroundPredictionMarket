import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { User } from './entities/user.entity';
import { ConfigService } from 'src/config/config.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async register(
    username: string,
    email: string,
    password: string,
    walletAddress: string,
  ) {
    let [existingUser] = await this.userService.find({ username });
    if (existingUser) throw new ConflictException('User already exists.');
    [existingUser] = await this.userService.find({ email });
    if (existingUser) throw new ConflictException('User already exists.');

    const user = await this.userService.create(
      username,
      email,
      await this.configService.hashSalt(password),
      walletAddress,
    );
    return user;
  }

  async checkPassword(user: User, password: string): Promise<boolean> {
    const [salt, hashedPassword] = user.password.split('.');
    const enteredPasswordHashed = await this.configService.hash(password, salt);
    return hashedPassword == enteredPasswordHashed;
  }

  async login(identifier: string, password: string) {
    const [user] = await this.userService.find(
      identifier.includes('@')
        ? { email: identifier }
        : { username: identifier },
    );
    if (!user) throw new NotFoundException('User not found!');
    if (!(await this.checkPassword(user, password))) return null;
    return user;
  }
}
