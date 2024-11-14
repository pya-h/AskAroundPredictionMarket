import { Module } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { BinaryPredictionMarket } from './entities/market.entity';
import { OutcomeToken } from './entities/outcome-token.entity';
import { PredictionOutcome } from './entities/outcome.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { BinaryPredictionController } from './binary-prediction.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BinaryPredictionMarket,
      OutcomeToken,
      PredictionOutcome,
    ]),
    BlockchainModule,
  ],
  providers: [BinaryPredictionService],
  exports: [BinaryPredictionService],
  controllers: [BinaryPredictionController],
})
export class BinaryPredictionModule {}
