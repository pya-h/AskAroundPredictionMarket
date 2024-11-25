import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PredictionMarketModule } from './binary-prediction/prediction-market.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { selectedDbConfig } from './config/db.config';

@Module({
  imports: [
    PredictionMarketModule,
    BlockchainModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: selectedDbConfig,
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
