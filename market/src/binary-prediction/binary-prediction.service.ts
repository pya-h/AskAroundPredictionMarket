import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BinaryPredictionMarket } from './entities/market.entity';
import { Repository } from 'typeorm';

@Injectable()
export class BinaryPredictionService {
  constructor(
    @InjectRepository(BinaryPredictionMarket)
    readonly binaryPredictionMarketRepository: Repository<BinaryPredictionMarket>,
  ) {}

  createMarket() {
    // TODO: Integrate with blockchain service
  }

  resolveMarket() {
    // TODO:
  }

  predict() {
    // TODO:
  }
}
