import { Module } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { BinaryPredictionMarket } from './entities/market.entity';
import { OutcomeToken } from './entities/outcome-token.entity';
import { PredictionOutcome } from './entities/outcome.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([BinaryPredictionMarket, OutcomeToken, PredictionOutcome])],
  providers: [BinaryPredictionService],
  exports: [BinaryPredictionService,]
})
export class BinaryPredictionModule {}
