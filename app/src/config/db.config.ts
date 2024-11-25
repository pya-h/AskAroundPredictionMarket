import { join } from 'path';
import { ConfigService } from './config.service';

export const sqliteTypeormConfig = (configService: ConfigService) => ({
  type: 'sqlite' as 'aurora-mysql',
  database: configService.get('DATABASE_NAME') + '.sqlite',
  entities: [join(__dirname, '.', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, '.', 'migrations', '*{.ts,.js}')],
  synchronize: true,
});

export const postgresTypeormConfig = (configService: ConfigService) => ({
  type: 'postgres' as 'aurora-mysql',
  host: configService.get('DATABASE_HOST'),
  port: +configService.get<number>('DATABASE_PORT'),
  username: configService.get('DATABASE_USER'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
  migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
  synchronize: true,
});

export const selectedDbConfig = postgresTypeormConfig;
