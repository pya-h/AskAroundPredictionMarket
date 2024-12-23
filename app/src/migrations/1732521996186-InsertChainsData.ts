import { ConfigService } from '../config/config.service';
import { MigrationInterface, QueryRunner } from 'typeorm';

const configService = new ConfigService();

export class InsertChainsData1732521996186 implements MigrationInterface {
  private rpcUrl: string;
  private chainId: number;
  private webSocketRpcUrl: string;

  constructor() {
    this.rpcUrl = configService.getOrThrow('NET_RPC_URL');
    this.chainId = +configService.getOrThrow('NET_CHAIN_ID');
    this.webSocketRpcUrl =
      configService.get('NET_WEBSOCKET_RPC_URL') ||
      this.rpcUrl.replace('http', 'ws');
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."chain" (id, "name", rpc_url, ws_rpc_url) VALUES ($1, $2, $3, $4)`,
      [
        this.chainId,
        'Ganache Local TestNet',
        this.rpcUrl,
        this.webSocketRpcUrl,
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM public."chain" WHERE id=$1`, [
      this.chainId,
    ]);
  }
}
