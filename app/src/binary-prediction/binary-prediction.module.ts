import { Module } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { BinaryPredictionMarket } from './entities/market.entity';
import { PredictionOutcome } from './entities/outcome.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainModule } from 'src/blockchain/blockchain.module';
import { BinaryPredictionController } from './binary-prediction.controller';
import { Oracle } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BinaryPredictionMarket,
      PredictionOutcome,
      Oracle,
      ConditionalToken,
      OutcomeCollection,
    ]),
    BlockchainModule,
  ],
  providers: [BinaryPredictionService],
  exports: [BinaryPredictionService],
  controllers: [BinaryPredictionController],
})
export class BinaryPredictionModule {}
