import { MigrationInterface, QueryRunner } from 'typeorm';
import { ConfigService } from '../config/config.service';

const configService = new ConfigService();

export class InsertOperatorBlockchainWallet1732526967944
  implements MigrationInterface
{
  private operatorPublicKey: string;
  private operatorPrivateKey: string;

  constructor() {
    this.operatorPrivateKey = configService.getOrThrow(
      'TESTNET_OPERATOR_PRIVATE_KEY',
    );
    this.operatorPublicKey = configService.getOrThrow(
      'TESTNET_OPERATOR_PUBLIC_KEY',
    );
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."blockchain_wallet" (address, "secret", user_id) VALUES ($1, $2, $3)`,
      [this.operatorPublicKey, this.operatorPrivateKey, 0],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."blockchain_wallet" WHERE user_id=$1`,
      [0],
    );
  }
}
