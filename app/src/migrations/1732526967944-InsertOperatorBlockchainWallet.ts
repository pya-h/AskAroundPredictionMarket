import { MigrationInterface, QueryRunner } from 'typeorm';
import { ConfigService } from '../config/config.service';
import { BlockchainWallet } from '../blockchain-core/entities/blockchain-wallet.entity';
import { getDefaultAdminId } from '../core/migrations';

const configService = new ConfigService();

export class InsertOperatorBlockchainWallet1732526967944
  implements MigrationInterface
{
  private operatorPublicKey: string;
  private operatorPrivateKey: string;

  constructor() {
    this.operatorPrivateKey = configService.getOrThrow(
      'NET_OPERATOR_PRIVATE_KEY',
    );
    this.operatorPublicKey = configService.getOrThrow('NET_OPERATOR_ADDRESS');
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    const adminId = await getDefaultAdminId(queryRunner);
    await queryRunner.query(
      `INSERT INTO public."blockchain_wallet" (address, "secret", user_id) VALUES ($1, $2, $3)`,
      [
        this.operatorPublicKey,
        BlockchainWallet.encryptPrivateKey(this.operatorPrivateKey),
        adminId,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."blockchain_wallet" WHERE address=$1`,
      [this.operatorPublicKey],
    );
  }
}
