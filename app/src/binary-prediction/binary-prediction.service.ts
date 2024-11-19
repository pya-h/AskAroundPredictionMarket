import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinaryPredictionMarket } from './entities/market.entity';
import { Repository } from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { BlockchainService } from '../blockchain/blockchain.service';
import { CryptoTokenEnum } from '../blockchain/enums/crypto-token.enum';
import { Oracle } from './entities/oracle.entity';

@Injectable()
export class BinaryPredictionService {
  constructor(
    @InjectRepository(BinaryPredictionMarket)
    private readonly binaryPredictionMarketRepository: Repository<BinaryPredictionMarket>,
    @InjectRepository(PredictionOutcome)
    private readonly predictionOutcomeRepository: Repository<PredictionOutcome>,
    @InjectRepository(Oracle)
    private readonly oracleRepository: Repository<Oracle>,
    private readonly blockchainService: BlockchainService,
  ) {}

  async getDefaultOracle(chainId?: number) {
    return this.oracleRepository.findOne({
      where: {
        chainId: chainId || (await this.blockchainService.getCurrentChainId()),
      },
      order: {
        id: 'ASC',
      },
    });
  }

  getPredictionOutcomes(outcomes: string[]) {
    // TODO: First check wether there are previously created prediction outcomes with the same title.
    return this.predictionOutcomeRepository.save(
      outcomes.map((outcome) =>
        this.predictionOutcomeRepository.create({ title: outcome }),
      ),
    );
  }
  async createNewMarket(
    question: string,
    outcomes: string[],
    initialLiquidityInEth: number,
  ) {
    const chainId = await this.blockchainService.getCurrentChainId();
    const [predictionOutcomes, marketMaker, oracle] = await Promise.all([
      this.getPredictionOutcomes(outcomes),
      this.blockchainService.getDefaultMarketMaker(chainId),
      this.getDefaultOracle(chainId),
    ]);

    return this.blockchainService.createMarket(
      marketMaker,
      CryptoTokenEnum.WETH9,
      question,
      predictionOutcomes,
      initialLiquidityInEth,
      oracle,
    );
  }

  resolveMarket() {
    // TODO:
  }

  predict() {
    // TODO:
  }
}
