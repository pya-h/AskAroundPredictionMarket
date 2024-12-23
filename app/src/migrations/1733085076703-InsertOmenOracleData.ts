import { OracleConstants } from '../core/constants/constants';
import { OracleTypesEnum } from '../prediction-market/entities/oracle.entity';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { BlockchainWallet } from '../blockchain-wallet/entities/blockchain-wallet.entity';
import { ConfigService } from '../config/config.service';

const configService = new ConfigService();

export class InsertOmenOracleData1733085076703 implements MigrationInterface {
  private omenOracleAddress: string;
  private omenOraclePrivateKey: string;

  constructor() {
    this.omenOraclePrivateKey = configService.getOrThrow(
      'NET_OMEN_ORACLE_PRIVATE_KEY',
    );
    this.omenOracleAddress = configService.getOrThrow(
      'NET_OMEN_ORACLE_ADDRESS',
    );
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    const salesmanId = 1; // TODO: create a new user for oracle
    await queryRunner.query(
      `INSERT INTO public."blockchain_wallet" (address, "secret", user_id) VALUES ($1, $2, $3)`,
      [
        this.omenOracleAddress,
        BlockchainWallet.encryptPrivateKey(this.omenOraclePrivateKey),
        salesmanId,
      ],
    );

    const oracleWalletQueryResult = await queryRunner.query(
      'SELECT id FROM  public."blockchain_wallet" WHERE address=$1',
      [this.omenOracleAddress],
    );
    if (!oracleWalletQueryResult?.length)
      throw new Error(
        'Something went wrong while inserting Omen Oracle wallet data',
      );

    const accountId = oracleWalletQueryResult[0].id;
    await queryRunner.query(
      `INSERT INTO public."oracle" (id, "name", description, "type", account_id) VALUES ($1, $2, $3, $4, $5)`,
      [
        OracleConstants.CENTRALIZED_ORACLE_ID,
        'Omen Oracle',
        'OmenArena default centralized oracle, which is controlled by omen admins. At each prediction -with its oracle is set to this- resolve time, one of omenium trusted admins will determine the prediction answer according to latest news or data or etc.',
        OracleTypesEnum.CENTRALIZED.toString(),
        accountId,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM public."oracle" WHERE id=$1`, [
      OracleConstants.CENTRALIZED_ORACLE_ID,
    ]);
    await queryRunner.query(
      `DELETE FROM public."blockchain_wallet" WHERE address=$1`,
      [this.omenOracleAddress],
    );
  }
}
