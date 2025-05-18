import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndexesOnPMParticipationNRedeemHistory1739881024460
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE INDEX "idx_prediction_market_participation_market_id" ON "prediction_market_participation" ("market_id");
        CREATE INDEX "idx_prediction_market_participation_user_id" ON "prediction_market_participation" ("user_id");
        CREATE INDEX "idx_prediction_market_participation_outcome_id" ON "prediction_market_participation" ("outcome_id");
        CREATE INDEX "idx_prediction_market_participation_payment_token_id" ON "prediction_market_participation" ("payment_token_id");
        CREATE INDEX "idx_redeem_history_market_id" ON "redeem_history" ("market_id");
        CREATE INDEX "idx_redeem_history_condition_id" ON "redeem_history" ("condition_id");
        CREATE INDEX "idx_redeem_history_redeemer_id" ON "redeem_history" ("redeemer_id");
        CREATE INDEX "idx_redeem_history_token_id" ON "redeem_history" ("token_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP INDEX "idx_prediction_market_participation_market_id";
        DROP INDEX "idx_prediction_market_participation_user_id";
        DROP INDEX "idx_prediction_market_participation_outcome_id";
        DROP INDEX "idx_prediction_market_participation_payment_token_id";
        DROP INDEX "idx_redeem_history_market_id";
        DROP INDEX "idx_redeem_history_condition_id";
        DROP INDEX "idx_redeem_history_redeemer_id";
        DROP INDEX "idx_redeem_history_token_id";
    `);
  }
}
