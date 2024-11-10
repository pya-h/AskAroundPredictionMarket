import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Chain } from './entities/chain.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chain])],
  providers: [BlockchainService],
})
export class BlockchainModule {}
