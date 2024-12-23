import { Module } from '@nestjs/common';
import { PredictionMarketContractsService } from './prediction-market-contracts.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { BlockchainWalletModule } from '../blockchain-wallet/blockchain-wallet.module';
import { Contract } from 'ethers';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketMakerFactory, Contract]),
    BlockchainWalletModule,
  ],
  providers: [PredictionMarketContractsService],
  exports: [PredictionMarketContractsService],
})
export class PredictionMarketContractsModule {}
