import { Injectable } from '@nestjs/common';
import { PredictionOutcome } from '../binary-prediction/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { LmsrMarketMakerContractData } from './contracts/market.contracts';
import { Weth9CollateralToken } from './contracts/collateral-tokens.contracts';
import { ConditionTokenContractData } from './contracts/ctf.contracts';
import { OracleContractData } from './contracts/oracle.contracts';
import { ConfigService } from '../config/config.service';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerEthersWallet: ethers.Wallet;
  private marketMakerFactoryContract: ethers.Contract;
  private conditionalTokensContract: ethers.Contract;
  private collateralTokenContract: ethers.Contract;

  toKeccakHash(data: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
  }

  constructor(
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
    private readonly configService: ConfigService,
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const localTestnet = await this.getChain(1337); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(localTestnet.rpcUrl);
    const wallet = await this.blockchainWalletRepository.findOneBy({
      userId: 0,
    }); // TODO: Modify this, and also add relations to user.
    this.managerEthersWallet = new ethers.Wallet(
      // wallet.getPrivateKey(), // TODO: Change this later
      this.configService.get('MANAGER_WALLET_PRIVATE'),
      this.provider,
    );
    this.marketMakerFactoryContract = new ethers.Contract(
      LmsrMarketMakerContractData.address,
      LmsrMarketMakerContractData.abi,
      this.managerEthersWallet,
    );

    this.conditionalTokensContract = new ethers.Contract(
      ConditionTokenContractData.address,
      ConditionTokenContractData.abi,
      this.managerEthersWallet,
    );

    this.collateralTokenContract = new ethers.Contract(
      Weth9CollateralToken.address,
      Weth9CollateralToken.abi,
      this.managerEthersWallet,
    );
  }

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  getPrimaryAddresses(num: number, specificLength: number = 64) {
    return `0x${'0'.repeat(specificLength - num.toString().length)}${num}`;
  }

  async createMarket(
    question: string,
    outcomes: PredictionOutcome[],
    initialLiquidityInEth: number,
    oracleAddress: string = OracleContractData.address,
  ) {
    const initialLiquidity = ethers.parseEther(
      initialLiquidityInEth.toString(),
    );
    const questionHash = this.toKeccakHash(question);
    const prepareConditionTx =
      await this.conditionalTokensContract.prepareCondition(
        oracleAddress,
        questionHash,
        outcomes.length,
      );
    await prepareConditionTx.wait();
    console.log('Prepare condition finished, trx: ', prepareConditionTx);
    // trx.hash; // maybe use this in database? (not necessary though)

    const conditionId = await this.conditionalTokensContract.getConditionId(
      oracleAddress,
      questionHash,
      outcomes.length,
    );
    console.warn('Condition id = ', conditionId);

    const collateralDepositTx = await this.collateralTokenContract.deposit({
      value: initialLiquidity,
      nonce: await this.managerEthersWallet.getNonce(),
    });
    await collateralDepositTx.wait();
    console.log(
      'Collateral token deposit completed, trx:',
      collateralDepositTx,
    );

    const approveTx = await this.collateralTokenContract.approve(
      LmsrMarketMakerContractData.address,
      initialLiquidity,
    );
    await approveTx.wait();
    console.warn('Liquidity deposit completed and approved.');

    const lmsrFactoryTx =
      await this.marketMakerFactoryContract.createLMSRMarketMaker(
        ConditionTokenContractData.address,
        Weth9CollateralToken.address,
        [conditionId], // TODO: Maybe write another method to create multiple markets at the same time?
        0,
        '0x0000000000000000000000000000000000000000',
        initialLiquidity,
        { from: this.managerEthersWallet.address },
      );

    await lmsrFactoryTx.wait();
    console.log('LMSR Market creation finished, trx: ', lmsrFactoryTx);

    return {
      conditionId,
      prepareConditionTxHash: prepareConditionTx.hash,
      createMarketTxHash: lmsrFactoryTx.hash,
      ammType: 'LMSR',
    };
  }

  outcomeIndexToIndexSet(outcomeIndices: number | number[]) {
    if (!(outcomeIndices instanceof Array)) {
      return parseInt((10 ** +outcomeIndices).toString(), 2);
    }
    let value = 0;
    for (const index of outcomeIndices) {
      value += parseInt((10 ** index).toString(), 2);
    }
    return value;
  }

  getCollectionId(
    conditionId: string,
    possibleOutcomeIndices: number | number[],
    parentCollectionId: string | null = null,
  ) {
    return this.conditionalTokensContract.getCollectionId(
      parentCollectionId || this.zeroAddress,
      conditionId,
      this.outcomeIndexToIndexSet(possibleOutcomeIndices),
    );
  }

  getOutcomeSlotsCount(conditionId: string) {
    return this.conditionalTokensContract.getOutcomeSlotCount(conditionId);
  }

  async validateMarketCreation(
    conditionId: string,
    marketOutcomesCount: number = 2,
  ) {
    return (
      (await this.getOutcomeSlotsCount(conditionId)) === marketOutcomesCount
    ); // As gnosis docs says, this is the proper way to validate the market creation operation, after calling prepareCondition.
  }

  async getPositionId(
    collateralToken: CryptocurrencyToken,
    collectionId: string,
  ) {
    return this.conditionalTokensContract.getPositionId(
      collateralToken.address,
      collectionId,
    );
  }

  async getBlocksTransactions(blockNumber: number) {
    const block = await this.provider.getBlock(blockNumber);

    return {
      blockNumber: block.number,
      blockHash: block.hash,
      timestamp: block.timestamp,
      // or other block data
      transactions: await Promise.all(
        block.transactions.map(async (txHash) => {
          const { hash, from, to, value, ...extra } =
            await this.provider.getTransaction(txHash);
          return {
            hash,
            from,
            to,
            amount: ethers.formatEther(value),
            extra,
          };
        }),
      ),
    };
  }

  async getLatestBlock() {
    const latestBlockNumber = await this.provider.getBlockNumber();
    return this.getBlocksTransactions(latestBlockNumber);
  }
}
