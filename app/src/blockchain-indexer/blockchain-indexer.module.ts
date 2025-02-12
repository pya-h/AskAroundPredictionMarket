import { Module } from '@nestjs/common';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { PredictionMarketContractsModule } from '../prediction-market-contracts/prediction-market-contracts.module';
import { PredictionMarketModule } from '../prediction-market/prediction-market.module';
import { BlockchainCoreModule } from 'src/blockchain-core/blockchain-core.module';
import { BlockchainIndexerController } from './blockchain-indexer.controller';

@Module({
  imports: [
    PredictionMarketContractsModule,
    PredictionMarketModule,
    BlockchainCoreModule,
  ],
  providers: [BlockchainIndexerService],
  controllers: [BlockchainIndexerController],
})
export class BlockchainIndexerModule {}
