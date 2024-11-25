import { MigrationInterface, QueryRunner } from 'typeorm';

export class InsertOracleContractData1732527233111
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."oracle" ("name", chain_id, address, description, abi) VALUES ($1, $2, $3, $4, $5)`,
      [
        'TestOracle',
        1337,
        '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
        'A test oracle just for testing purposes and it resolves manually usually specified endpoints or whatever.',
        [
          // FIXME: ABI needs changing, find an oracle in gnosis contracts.
          {
            inputs: [
              { internalType: 'bytes32', name: '_identifier', type: 'bytes32' },
              { internalType: 'uint256', name: '_timestamp', type: 'uint256' },
              { internalType: 'bytes', name: '_ancillaryData', type: 'bytes' },
              { internalType: 'address', name: '_requester', type: 'address' },
              { internalType: 'uint256', name: '_reward', type: 'uint256' },
            ],
            name: 'requestPrice',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            inputs: [
              { internalType: 'bytes32', name: '_identifier', type: 'bytes32' },
              { internalType: 'uint256', name: '_timestamp', type: 'uint256' },
              { internalType: 'bytes', name: '_ancillaryData', type: 'bytes' },
              { internalType: 'address', name: '_requester', type: 'address' },
            ],
            name: 'settle',
            outputs: [
              { internalType: 'int256', name: 'settledPrice', type: 'int256' },
            ],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM public."oracle" WHERE address=$1`, [
      '0xFFcf8FDEE72ac11b5c542428B35EEF5769C409f0',
    ]);
  }
}
