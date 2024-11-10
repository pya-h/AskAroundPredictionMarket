import { Injectable } from '@nestjs/common';
import { CryptoTokenEnum } from './enums/crypto-token.enum';
import { PredictionOutcome } from 'src/binary-prediction/entities/outcome.entity';
import { ethers } from 'ethers';
import { InjectRepository } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BlockchainService {
  private provider: ethers.JsonRpcProvider;
  private managerWallet: ethers.Wallet;
  private marketMakerfactory: ethers.Contract;
  private FPMM: ethers.Contract;

  getChain(chainId: number) {
    return this.chainRepository.findOneBy({ id: chainId });
  }

  constructor(
    @InjectRepository(Chain)
    private readonly chainRepository: Repository<Chain>,
  ) {
    this.init().catch((ex) =>
      console.error('Failed to init blockchain service:', ex),
    );
  }

  async init() {
    const sepoliaNetwork = await this.getChain(11155111); // TODO: Decide how to set this.
    this.provider = new ethers.JsonRpcProvider(sepoliaNetwork.rpcUrl);
    this.managerWallet = new ethers.Wallet()
  }
  async createMarket(
    collateralToken: CryptoTokenEnum,
    initialLiquidity: number,
    outcomes: PredictionOutcome[],
  ) {}
}
