import { Module } from '@nestjs/common';
import { PredictionMarketService } from './prediction-market.service';
import { PredictionMarket } from './entities/market.entity';
import { PredictionOutcome } from './entities/outcome.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PredictionMarketContractsModule } from '../prediction-market-contracts/prediction-market-contracts.module';
import { PredictionMarketController } from './prediction-market.controller';
import { Oracle } from './entities/oracle.entity';
import { ConditionalToken } from './entities/conditional-token.entity';
import { OutcomeCollection } from './entities/outcome-collection.entity';
import { MarketCategory } from './entities/market-category.entity';
import { BlockchainWalletModule } from '../blockchain-wallet/blockchain-wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PredictionMarket,
      PredictionOutcome,
      Oracle,
      ConditionalToken,
      OutcomeCollection,
      MarketCategory,
    ]),
    PredictionMarketContractsModule,
    BlockchainWalletModule,
  ],
  providers: [PredictionMarketService],
  exports: [PredictionMarketService],
  controllers: [PredictionMarketController],
})
export class PredictionMarketModule {}
