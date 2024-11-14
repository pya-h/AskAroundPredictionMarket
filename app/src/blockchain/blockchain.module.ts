import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chain, BlockchainWallet])],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
