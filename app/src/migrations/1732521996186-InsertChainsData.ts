import { ConfigService } from '../config/config.service';
import { MigrationInterface, QueryRunner } from 'typeorm';

const configService = new ConfigService();

export class InsertChainsData1732521996186 implements MigrationInterface {
  private rpcUrl: string;
  private chainId: number;

  constructor() {
    this.rpcUrl = configService.getOrThrow('TESTNET_RPC_URL');
    this.chainId = +configService.getOrThrow('TESTNET_CHAIN_ID');
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."chain" (id, "name", rpc_url) VALUES ($1, $2, $3)`,
      [this.chainId, 'Ganache Local TestNet', this.rpcUrl],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM public."chain" WHERE id=$1`, [
      this.chainId,
    ]);
  }
}
