import { Module } from '@nestjs/common';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { User } from '../user/entities/user.entity';
import { BlockchainWalletController } from './blockchain-wallet.controller';

@Module({
  imports: [TypeOrmModule.forFeature([BlockchainWallet, User])],
  providers: [BlockchainWalletService],
  exports: [BlockchainWalletService],
  controllers: [BlockchainWalletController],
})
export class BlockchainWalletModule {}
