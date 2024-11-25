import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertOperatorBlockchainWallet1732526967944
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."blockchain_wallet" ("name", public_key, "secret", user_id) VALUES ($1, $2, $3, $4)`,
      [
        'operator',
        '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1',
        '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
        0,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."blockchain_wallet" WHERE user_id=$1`,
      [0],
    );
  }
}
