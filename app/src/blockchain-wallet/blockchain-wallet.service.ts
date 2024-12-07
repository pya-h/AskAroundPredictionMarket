import { ConflictException, Injectable } from '@nestjs/common';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserConstants } from '../core/constants/constants';
import { User } from '../user/entities/user.entity';

@Injectable()
export class BlockchainWalletService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(BlockchainWallet)
    private readonly blockchainWalletRepository: Repository<BlockchainWallet>,
  ) {}

  get zeroAddress() {
    return '0x0000000000000000000000000000000000000000000000000000000000000000';
  }

  getPrimaryAddresses(num: number, specificLength: number = 64) {
    return `0x${'0'.repeat(specificLength - num.toString().length)}${num}`;
  }

  async getOperatorWallet() {
    const admin = await this.userRepository.findOneBy({
      username: UserConstants.ADMIN_USERNAME,
    });
    return this.blockchainWalletRepository.findOneBy({
      userId: admin.id,
    });
  }

  async alreadyOwnsWallet(userId: number) {
    return await this.blockchainWalletRepository.findOneBy({ userId });
  }

  async createWallet(ownerId: number, address?: string, privateKey?: string) {
    // TODO: After finalizing this sections, you must make address mandatory.
    if (await this.alreadyOwnsWallet(ownerId))
      throw new ConflictException('This user already has a blockchain wallet.');
    if (!address) {
      // TODO:  Create or assign a blockchain wallet to this user and set the public/private key values then
    }
    return this.blockchainWalletRepository.save(
      this.blockchainWalletRepository.create({
        address,
        secret: privateKey, // FIXME: This may need encryption
        userId: ownerId,
      }),
    );
  }

  async getWallet(userId: number) {
    const wallet = await this.blockchainWalletRepository.findOne({
      where: { userId },
    });
    if (!wallet) return this.createWallet(userId);
    return wallet;
  }
}
