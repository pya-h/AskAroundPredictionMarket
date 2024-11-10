import { Module } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { BinaryPredictionMarket } from './entities/market.entity';
import { OutcomeToken } from './entities/outcome-token.entity';
import { PredictionOutcome } from './entities/outcome.entity';

@Module({
  imports: [BinaryPredictionMarket, OutcomeToken, PredictionOutcome],
  providers: [BinaryPredictionService],
})
export class BinaryPredictionModule {}
