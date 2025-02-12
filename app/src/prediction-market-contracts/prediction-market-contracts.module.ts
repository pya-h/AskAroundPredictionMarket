import { Module } from '@nestjs/common';
import { PredictionMarketContractsService } from './prediction-market-contracts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { BlockchainCoreModule } from '../blockchain-core/blockchain-core.module';
import { LmsrMarketHelperService } from './helpers/lmsr-market-helper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketMakerFactory]),
    BlockchainCoreModule,
  ],
  providers: [PredictionMarketContractsService, LmsrMarketHelperService],
  exports: [PredictionMarketContractsService],
})
export class PredictionMarketContractsModule {}
