import { Injectable } from '@nestjs/common';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { PredictionOutcome } from 'src/binary-prediction/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import {
  FixedProductMarketMakerContract,
  MarketMakerFactoryContract,
} from './contracts/market.contract';
@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerEthersWallet: ethers.Wallet;
  private marketMakerFactory: ethers.Contract;
  private fixedProductAMM: ethers.Contract;

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
    const sepoliaNetwork = await this.getChain(11155111); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(sepoliaNetwork.rpcUrl);
    const wallet = await this.blockchainWalletRepository.findOneBy({
      userId: 0,
    }); // TODO: Modify this, and also add relations to user.
    this.managerEthersWallet = new ethers.Wallet(
      wallet.getPrivateKey(),
      this.provider,
    );
    this.marketMakerFactory = new ethers.Contract(
      MarketMakerFactoryContract.address,
      MarketMakerFactoryContract.abi,
      this.managerEthersWallet,
    );

    this.fixedProductAMM = new ethers.Contract(
      FixedProductMarketMakerContract.address,
      FixedProductMarketMakerContract.abi,
      this.managerEthersWallet,
    );
  }

  async createMarket(
    collateralToken: CryptoTokenEnum,
    initialLiquidity: number,
    outcomes: PredictionOutcome[],
  ) {
    const trx = await this.marketMakerFactory.createMarketMaker(
      collateralToken.toString(),
      initialLiquidity,
      outcomes.map((item) => item.title),
    );
    await trx.wait();
    return trx.hash;
  }

  async buyOutcomeToken(
    marketId: number,
    choice: PredictionOutcome,
    amount: number,
  ) {
    const trx = await this.fixedProductAMM.butOutcomeToken(
      choice.title,
      amount,
    ); // FIXME: ABI seems wrong
    await trx.await();
    return trx.hash;
  }
}
