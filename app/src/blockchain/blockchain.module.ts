import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { MarketMakerFactory } from './entities/market-maker-factory.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Chain,
      BlockchainWallet,
      CryptocurrencyToken,
      MarketMakerFactory,
    ]),
  ],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
