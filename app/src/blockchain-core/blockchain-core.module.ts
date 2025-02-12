import { Module } from '@nestjs/common';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { User } from '../user/entities/user.entity';
import { BlockchainWalletController } from './blockchain-wallet.controller';
import { Chain } from './entities/chain.entity';
import { CryptocurrencyToken } from './entities/cryptocurrency-token.entity';
import { BlockchainHelperService } from './blockchain-helper.service';
import { ContractEntity } from './entities/contract.entity';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BlockchainWallet,
      User,
      Chain,
      CryptocurrencyToken,
      ContractEntity,
    ]),
    ConfigModule,
  ],
  providers: [BlockchainWalletService, BlockchainHelperService],
  exports: [BlockchainWalletService, BlockchainHelperService],
  controllers: [BlockchainWalletController],
})
export class BlockchainCoreModule {}
