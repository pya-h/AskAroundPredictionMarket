import { MigrationInterface, QueryRunner } from "typeorm";

export class InsertChainsData1732521996186 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`INSERT INTO public."chain" (id, "name", rpc_url) VALUES ($1, $2, $3)`, [
            1337, "Ganache Local TestNet", "http://127.0.0.1:8545" 
        ])
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM public."chain" WHERE id=$1`, [1337])
    }

}
