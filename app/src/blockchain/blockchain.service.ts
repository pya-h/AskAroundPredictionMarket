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

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerEthersWallet: ethers.Wallet;
  private marketMakerFactoryContract: ethers.Contract;
  private conditionTokensContract: ethers.Contract;
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

    this.conditionTokensContract = new ethers.Contract(
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

  async createMarket(
    question: string,
    outcomes: PredictionOutcome[],
    initialLiquidityInEth: number,
  ) {
    const initialLiquidity = ethers.parseEther(
      initialLiquidityInEth.toString(),
    );
    const questionHash = this.toKeccakHash(question);
    const trx = await this.conditionTokensContract.prepareCondition(
      OracleContractData.address,
      questionHash,
      outcomes.length,
    );
    await trx.wait();
    console.log('Prepare condition finished, trx: ', trx);
    // trx.hash; // maybe use this in database? (not necessary though)

    const conditionId = await this.conditionTokensContract.getConditionId(
      OracleContractData.address,
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
        [conditionId],
        0,
        '0x0000000000000000000000000000000000000000',
        initialLiquidity,
        { from: this.managerEthersWallet.address },
      );

    await lmsrFactoryTx.wait();
    console.log('LMSR Market creation finished, trx: ', trx);
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
