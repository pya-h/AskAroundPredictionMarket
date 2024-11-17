import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinaryPredictionMarket } from './entities/market.entity';
import { Repository } from 'typeorm';
import { PredictionOutcome } from './entities/outcome.entity';
import { BlockchainService } from 'src/blockchain/blockchain.service';

@Injectable()
export class BinaryPredictionService {
  constructor(
    @InjectRepository(BinaryPredictionMarket)
    private readonly binaryPredictionMarketRepository: Repository<BinaryPredictionMarket>,
    @InjectRepository(PredictionOutcome)
    private readonly predictionOutcomeRepository: Repository<PredictionOutcome>,
    private readonly blockchainService: BlockchainService,
  ) {}

  async createNewMarket(
    question: string,
    outcomes: string[],
    initialLiquidityInEth: number,
  ) {
    const predictionOutcomes = await this.predictionOutcomeRepository.save(
      outcomes.map((outcome) =>
        this.predictionOutcomeRepository.create({ title: outcome }),
      ),
    );
    return this.blockchainService.createMarket(
      question,
      predictionOutcomes,
      initialLiquidityInEth,
    );
  }

  resolveMarket() {
    // TODO:
  }

  predict() {
    // TODO:
  }
}
