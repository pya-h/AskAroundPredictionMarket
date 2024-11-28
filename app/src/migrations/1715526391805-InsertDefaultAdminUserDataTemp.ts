import { config } from 'dotenv';
import { ConfigService } from '../config/config.service';
import { MigrationInterface, QueryRunner } from 'typeorm';

config();

const configService = new ConfigService();

export class InsertDefaultAdminUserData1715526391805
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."user" (id, username, password, email)
              VALUES ($1, $2, $3, $4)`,
      [
        0,
        'admin',
        (await configService.hashSalt(configService.get('ADMIN_PASSWORD'))).toString(),
        'admin@omenium.com',
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DELETE FROM public."user" WHERE user_id = 0');
  }
}
