import { Module } from '@nestjs/common';
import { BlockchainIndexerService } from './blockchain-indexer.service';
import { PredictionMarketContractsModule } from '../prediction-market-contracts/prediction-market-contracts.module';
import { PredictionMarketModule } from '../prediction-market/prediction-market.module';
import { BlockchainWalletModule } from 'src/blockchain-wallet/blockchain-wallet.module';

@Module({
  imports: [
    PredictionMarketContractsModule,
    PredictionMarketModule,
    BlockchainWalletModule,
  ],
  providers: [BlockchainIndexerService],
})
export class BlockchainIndexerModule {}
