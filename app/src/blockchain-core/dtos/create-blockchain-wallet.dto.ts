import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEthereumAddress,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBlockchainWalletDto {
  @ApiProperty({
    description: 'The id of the user you wish to manually assign wallet data.',
    required: true,
  })
  @IsInt()
  userId: number;

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

  @ApiPropertyOptional({
    description:
      'Sets the wallet data by force, even if user already has a wallet.',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}
