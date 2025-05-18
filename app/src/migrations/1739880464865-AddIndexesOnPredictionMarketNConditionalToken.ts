import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesOnPredictionMarketNConditionalToken1739880464865
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE INDEX "idx_prediction_market_creator_id" ON "base_prediction_market" ("creator_id");
        CREATE INDEX "idx_prediction_market_oracle_id" ON "base_prediction_market" ("oracle_id");
        CREATE INDEX "idx_prediction_market_chain_id" ON "base_prediction_market" ("chain_id");
        CREATE INDEX "idx_prediction_market_category_id" ON "base_prediction_market" ("category_id");
        CREATE INDEX "idx_prediction_market_should_resolve_at" ON "base_prediction_market" ("should_resolve_at");
        CREATE INDEX "idx_prediction_market_collateral_token_id" ON "base_prediction_market" ("collateral_token_id");
        CREATE INDEX "idx_prediction_market_amm_factory_id" ON "base_prediction_market" ("amm_factory_id");

        CREATE INDEX "idx_prediction_market_condition_id" ON "prediction_market" ("condition_id");
        CREATE INDEX "idx_prediction_market_address" ON "prediction_market" ("address");
        CREATE INDEX "idx_prediction_market_question_id" ON "prediction_market" ("question_id");
        CREATE INDEX "idx_prediction_market_question" ON "prediction_market" ("question");
        CREATE INDEX "idx_prediction_market_closed_at" ON "prediction_market" ("closed_at");
        CREATE INDEX "idx_prediction_market_resolved_at" ON "prediction_market" ("resolved_at");

        CREATE INDEX "idx_conditional_token_market_id" ON "conditional_token" ("market_id");
        CREATE INDEX "idx_conditional_token_collection_id" ON "conditional_token" ("collection_id");
        CREATE INDEX "idx_conditional_token_token_index" ON "conditional_token" ("token_index");
        CREATE INDEX "idx_conditional_token_prediction_outcome_id" ON "conditional_token" ("prediction_outcome_id");
        CREATE INDEX "idx_conditional_token_amount_invested" ON "conditional_token" ("amount_invested");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "idx_prediction_market_creator_id";
        DROP INDEX "idx_prediction_market_oracle_id";
        DROP INDEX "idx_prediction_market_chain_id";
        DROP INDEX "idx_prediction_market_category_id";
        DROP INDEX "idx_prediction_market_should_resolve_at";
        DROP INDEX "idx_prediction_market_collateral_token_id";
        DROP INDEX "idx_prediction_market_amm_factory_id";

        DROP INDEX "idx_prediction_market_condition_id";
        DROP INDEX "idx_prediction_market_address";
        DROP INDEX "idx_prediction_market_question_id";
        DROP INDEX "idx_prediction_market_question";
        DROP INDEX "idx_prediction_market_closed_at";
        DROP INDEX "idx_prediction_market_resolved_at";

        DROP INDEX "idx_conditional_token_market_id";
        DROP INDEX "idx_conditional_token_collection_id";
        DROP INDEX "idx_conditional_token_token_index";
        DROP INDEX "idx_conditional_token_prediction_outcome_id";
        DROP INDEX "idx_conditional_token_amount_invested";
    `);
  }
}
