import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';
import { BlockchainIndexerService } from './indexer.service';
import { BlockchainWalletModule } from '../blockchain-wallet/blockchain-wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Chain, CryptocurrencyToken, MarketMakerFactory]),
    BlockchainWalletModule,
  ],
  providers: [BlockchainService, BlockchainIndexerService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
