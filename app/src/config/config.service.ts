import { Injectable } from '@nestjs/common';
import { config } from 'dotenv';

config();

@Injectable()
export class ConfigService {
  // this is just simple config service used just to make other modules code similar to my another project i intend to use this project modules in.
  get<T=string>(fieldName: string): T | null {
    return (process.env[fieldName] as T) || null;
  }
}
