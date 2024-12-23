import { Module } from '@nestjs/common';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { User } from '../user/entities/user.entity';
import { BlockchainWalletController } from './blockchain-wallet.controller';
import { Chain } from './entities/chain.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockchainWallet,
      User,
      Chain,
      CryptocurrencyToken,
    ]),
  ],
  providers: [BlockchainWalletService],
  exports: [BlockchainWalletService],
  controllers: [BlockchainWalletController],
})
export class BlockchainWalletModule {}
