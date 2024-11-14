import { Injectable } from '@nestjs/common';
import { PredictionOutcome } from 'src/binary-prediction/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import {
  Weth9CollateralToken,
  LmsrMarketMakerContractData,
} from './contracts/market.contract';

import { ConditionTokenContractData } from './contracts/ctf.contract';
@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerEthersWallet: ethers.Wallet;
  private marketMakerFactoryContract: ethers.Contract;
  private conditionTokensContract: ethers.Contract;

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
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const sepoliaNetwork = await this.getChain(1337); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(sepoliaNetwork.rpcUrl);
    const wallet = await this.blockchainWalletRepository.findOneBy({
      userId: 0,
    }); // TODO: Modify this, and also add relations to user.
    this.managerEthersWallet = new ethers.Wallet( // TODO: Modiy this to galache wallet.
      wallet.getPrivateKey(),
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
  }

  async createMarket(
    collateralTokenAddress = Weth9CollateralToken.address,
    question: string,
    outcomes: PredictionOutcome[],
  ) {
    const questionHash = this.toKeccakHash(question);
    const trx = await this.conditionTokensContract.prepareCondition(
      collateralTokenAddress,
      questionHash,
      outcomes.length,
    );
    await trx.wait();
    // trx.hash; // maybe use this in database? (not necessary though)

    const conditionId = await this.conditionTokensContract.getConditionId(
      collateralTokenAddress,
      questionHash,
      outcomes.length,
    );
    // TODO: Checkout how to get output value.
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
