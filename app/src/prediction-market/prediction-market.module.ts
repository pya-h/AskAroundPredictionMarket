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
import { BlockchainCoreModule } from '../blockchain-core/blockchain-core.module';
import { UserModule } from '../user/user.module';
import { PredictionMarketParticipation } from './entities/participation.entity';
import { MinioModule } from 'src/minio/minio.module';
import { BasePredictionMarket } from './entities/bases/base-market.entity';
import { BaseConditionalToken } from './entities/bases/base-conditional-token.entity';
import { RedeemHistory } from './entities/redeem-history.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BasePredictionMarket,
      BaseConditionalToken,
      PredictionMarket,
      PredictionOutcome,
      Oracle,
      ConditionalToken,
      OutcomeCollection,
      MarketCategory,
      PredictionMarketParticipation,
      RedeemHistory,
    ]),
    PredictionMarketContractsModule,
    BlockchainCoreModule,
    UserModule,
    MinioModule,
  ],
  providers: [PredictionMarketService],
  exports: [PredictionMarketService],
  controllers: [PredictionMarketController],
})
export class PredictionMarketModule {}
