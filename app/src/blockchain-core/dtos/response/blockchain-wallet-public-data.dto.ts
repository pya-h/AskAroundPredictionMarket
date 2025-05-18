import { Expose, Type } from 'class-transformer';
import { User } from 'src/user/entities/user.entity';

export class BlockchainWalletPublicDataDto {
  @Expose() id: number;
  @Expose() address: string;

  @Expose() userId: number;

  @Type(() => User)
  @Expose()
  user: User;

  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
