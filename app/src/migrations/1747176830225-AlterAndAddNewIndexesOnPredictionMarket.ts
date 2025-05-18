import { addIndexOnColumns, dropColumnIndexes } from '../core/migrations';
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterAndAddNewIndexesOnPredictionMarket1747176830225
  implements MigrationInterface
{
  private readonly newIndexes = {
    base_prediction_market: ['should_start_at'],
    prediction_market: [
      'creator_id',
      'oracle_id',
      'chain_id',
      'category_id',
      'should_resolve_at',
      'collateral_token_id',
      'amm_factory_id',
    ],
    blockchain_wallet: ['address', 'user_id'],
    cryptocurrency_token: ['symbol', 'chain_id'],
    blockchain_transaction_log: ['user_id', 'token_id', 'type'],
  };
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      // Previously i made mistake to name base_prediction_market indexes:
      `ALTER INDEX "idx_prediction_market_creator_id" RENAME TO "idx_base_prediction_market_creator_id";
        ALTER INDEX "idx_prediction_market_oracle_id" RENAME TO "idx_base_prediction_market_oracle_id";
        ALTER INDEX "idx_prediction_market_chain_id" RENAME TO "idx_base_prediction_market_chain_id";
        DROP INDEX IF EXISTS "idx_prediction_market_category_id";
        DROP INDEX IF EXISTS "idx_prediction_market_should_resolve_at";
        ALTER INDEX "idx_prediction_market_collateral_token_id" RENAME TO "idx_base_prediction_market_collateral_token_id";
        DROP INDEX IF EXISTS "idx_prediction_market_amm_factory_id";`,
    );

    await addIndexOnColumns(queryRunner, this.newIndexes);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropColumnIndexes(queryRunner, this.newIndexes);

    await queryRunner.query(
      `ALTER INDEX "idx_base_prediction_market_creator_id" RENAME TO "idx_prediction_market_creator_id";
        ALTER INDEX "idx_base_prediction_market_oracle_id" RENAME TO "idx_prediction_market_oracle_id";
        ALTER INDEX "idx_base_prediction_market_chain_id" RENAME TO "idx_prediction_market_chain_id";
        CREATE INDEX IF NOT EXISTS "idx_prediction_market_should_resolve_at" ON "base_prediction_market" ("should_resolve_at");
        ALTER INDEX "idx_base_prediction_market_collateral_token_id" RENAME TO "idx_prediction_market_collateral_token_id";
        CREATE INDEX "idx_prediction_market_category_id" ON "base_prediction_market" ("category_id");
        CREATE INDEX "idx_prediction_market_amm_factory_id" ON "base_prediction_market" ("amm_factory_id");`,
    );
  }
}
