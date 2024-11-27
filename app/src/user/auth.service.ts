import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { User } from './entities/user.entity';

const ascrypt = promisify(scrypt);

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  async register(username: string, email: string, password: string, walletAddress: string) {
    let [existingUser] = await this.userService.find({ username });
    if (existingUser) throw new ConflictException('User already exists.');
    [existingUser] = await this.userService.find({ email });
    if (existingUser) throw new ConflictException('User already exists.');
    const salt = randomBytes(8).toString('hex');
    const hashedPassword = await ascrypt(password, salt, 32);

    const user = await this.userService.create(
      username,
      email,
      `${salt}.${hashedPassword}`,
      walletAddress
    );
    return user;
  }

  async checkPassword(user: User, password: string): Promise<boolean> {
    const [salt, hashedPassword] = user.password.split('.');
    const enteredPasswordHashed = await ascrypt(password, salt, 32);
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
