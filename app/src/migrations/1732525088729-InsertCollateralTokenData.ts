import { CryptoTokenEnum } from '../blockchain/enums/crypto-token.enum';
import { MigrationInterface, QueryRunner } from 'typeorm';
import { ConfigService } from '../config/config.service';

const configService = new ConfigService();

export class InsertCollateralTokenData1732525088729
  implements MigrationInterface
{
  private collateralTokenContractAddress: string;

  constructor() {
    this.collateralTokenContractAddress = configService.getOrThrow(
      'TESTNET_COLLATERAL_TOKEN_ADDRESS',
    );
  }
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO public."cryptocurrency_token" ("name", symbol, chain_id, address, abi) VALUES ($1, $2, $3, $4, $5)`,
      [
        'Wrapped Ethereum',
        CryptoTokenEnum.WETH9.toString(),
        1337,
        this.collateralTokenContractAddress,
        JSON.stringify([
          {
            constant: true,
            inputs: [],
            name: 'name',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'decimals',
            outputs: [
              {
                name: '',
                type: 'uint8',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
            ],
            name: 'balanceOf',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'symbol',
            outputs: [
              {
                name: '',
                type: 'string',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: true,
            inputs: [
              {
                name: '',
                type: 'address',
              },
              {
                name: '',
                type: 'address',
              },
            ],
            name: 'allowance',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            payable: true,
            stateMutability: 'payable',
            type: 'fallback',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'src',
                type: 'address',
              },
              {
                indexed: true,
                name: 'guy',
                type: 'address',
              },
              {
                indexed: false,
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'Approval',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'src',
                type: 'address',
              },
              {
                indexed: true,
                name: 'dst',
                type: 'address',
              },
              {
                indexed: false,
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'Transfer',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'dst',
                type: 'address',
              },
              {
                indexed: false,
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'Deposit',
            type: 'event',
          },
          {
            anonymous: false,
            inputs: [
              {
                indexed: true,
                name: 'src',
                type: 'address',
              },
              {
                indexed: false,
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'Withdrawal',
            type: 'event',
          },
          {
            constant: false,
            inputs: [],
            name: 'deposit',
            outputs: [],
            payable: true,
            stateMutability: 'payable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'withdraw',
            outputs: [],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: true,
            inputs: [],
            name: 'totalSupply',
            outputs: [
              {
                name: '',
                type: 'uint256',
              },
            ],
            payable: false,
            stateMutability: 'view',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'guy',
                type: 'address',
              },
              {
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'approve',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'dst',
                type: 'address',
              },
              {
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'transfer',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
          {
            constant: false,
            inputs: [
              {
                name: 'src',
                type: 'address',
              },
              {
                name: 'dst',
                type: 'address',
              },
              {
                name: 'wad',
                type: 'uint256',
              },
            ],
            name: 'transferFrom',
            outputs: [
              {
                name: '',
                type: 'bool',
              },
            ],
            payable: false,
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ]),
      ],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM public."cryptocurrency_token" WHERE address=$1`,
      [this.collateralTokenContractAddress],
    );
  }
}
