import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PredictionMarketModule } from './prediction-market/prediction-market.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { selectedDbConfig } from './config/db.config';
import { UserModule } from './user/user.module';
import { PredictionMarketContractsModule } from './prediction-market-contracts/prediction-market-contracts.module';
import { BlockchainCoreModule } from './blockchain-core/blockchain-core.module';
import { BlockchainIndexerModule } from './blockchain-indexer/blockchain-indexer.module';
import { FileUploadModule } from './file-upload/file-upload.module';
import { MinioModule } from './minio/minio.module';

@Module({
  imports: [
    PredictionMarketModule,
    PredictionMarketContractsModule,
    BlockchainCoreModule,
    BlockchainIndexerModule,
    FileUploadModule,
    MinioModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: selectedDbConfig,
      inject: [ConfigService],
    }),
    ConfigModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
