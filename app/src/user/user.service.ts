import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { BlockchainService } from '../blockchain/blockchain.service';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly blockchainService: BlockchainService,
  ) {}

  // Notice: Password must be hashed. This is just temp.
  async create(
    username: string,
    email: string,
    password: string,
    walletAddress?: string,
  ) {
    const user: User = await this.userRepository.save(
      this.userRepository.create({
        username,
        password,
        email,
      }),
    );
    await this.blockchainService.createBlockchainWallet(user.id, walletAddress);
    return user;
  }

  createDirectly(username: string, email: string, password: string) {
    return this.userRepository.save({ username, password, email });
  }

  findOne(id: number) {
    if (!id) return null;
    return this.userRepository.findOneBy({ id });
  }

  find(searchParam: Partial<User>): Promise<User[]> {
    const { username, email } = searchParam;
    if (username) return this.userRepository.findBy({ username });
    if (email) return this.userRepository.findBy({ email });

    return Promise.resolve([]);
  }

  async updateById(id: number, fields: Partial<User>) {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }
    return this.update(user, fields);
  }

  update(user: User, fields: Partial<User>) {
    Object.assign(user, fields);
    return this.userRepository.save(user);
  }

  async removeById(id: number) {
    // Other approach is using delete. That does the job directly but as mentioned in update section about .update,
    // this delete method doesnt run Hooks too.
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.userRepository.remove(user); // remove & save and maybe run some hooks
  }
}
