import { Expose, Type } from 'class-transformer';
import { PublicUserData } from 'src/user/dto/public-user-data.dto';

export class BlockchainWalletPublicDataDto {
  @Expose() id: number;
  @Expose() address: string;

  @Expose() userId: number;

  @Type(() => PublicUserData)
  @Expose()
  user: PublicUserData;

  @Expose() createdAt: Date;
  @Expose() updatedAt: Date;
}
