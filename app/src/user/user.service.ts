import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Notice: Password must be hashed. This is just temp.
  async create(username: string, email: string, password: string) {
    const user: User = await this.userRepository.save(
      this.userRepository.create({
        username,
        password,
        email,
      }),
    );
    return user;
  }

  createDirectly(username: string, email: string, password: string) {
    return this.userRepository.save({ username, password, email });
  }

  findOne(id: number, shouldThrow: boolean = false) {
    if (!id) {
      if (shouldThrow) {
        throw new NotFoundException('User not found!');
      }
      return null;
    }
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
    // this delete method doesn't run Hooks too.
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException('User not found.');
    }

    return this.userRepository.remove(user); // remove & save and maybe run some hooks
  }
  getUsersCount() {
    return this.userRepository.count();
  }
}
