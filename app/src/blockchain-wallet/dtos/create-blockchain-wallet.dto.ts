import { ApiProperty } from '@nestjs/swagger';
import { IsEthereumAddress, IsString } from 'class-validator';

export class CreateBlockchainWalletDto {
  @ApiProperty({
    description:
      'Public key of user wallet on specified chain [just for test for now]',
  })
  @IsEthereumAddress()
  walletAddress: string;

  @ApiProperty({
    description:
      'Private key of user wallet on specified chain [just for test for now]',
  })
  @IsString()
  secret: string;
}
