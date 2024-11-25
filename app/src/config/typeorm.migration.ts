import { join } from 'path';
import { ConfigService } from './config.service';
import { config } from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { selectedDbConfig } from './db.config';

config();

const configService = new ConfigService();

export default new DataSource({
  ...selectedDbConfig(configService),
  extra:
    configService.get<string>('DATABASE_SSL_MODE').toLowerCase() === 'true'
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : null,
} as DataSourceOptions);
