import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt } from 'crypto';
import { config } from 'dotenv';
import { promisify } from 'util';
const ascrypt = promisify(scrypt);

config();

@Injectable()
export class ConfigService {
  // this is just simple config service used just to make other modules code similar to my another project i intend to use this project modules in.
  get<T = string>(fieldName: string): T | null {
    return (process.env[fieldName] as T) || null;
  }

  async hashSalt(chars: string) {
    const salt = randomBytes(8).toString('hex');
    const hashedPassword = await this.hash(chars, salt);
    return `${salt}.${hashedPassword}`;
  }

  hash(chars: string, salt: string) {
    return ascrypt(chars, salt, 32);
  }
}
