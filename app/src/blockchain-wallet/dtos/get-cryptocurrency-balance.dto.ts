import { ApiProperty } from '@nestjs/swagger';
import { CryptoTokenEnum } from '../../prediction-market-contracts/enums/crypto-token.enum';
import { IsEnum, IsNotEmpty, IsNumberString } from 'class-validator';

export class GetCryptocurrencyBalanceDto {
  @ApiProperty({
    description: 'The cryptocurrency which users wish to get its balance.',
    required: true,
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  @IsNotEmpty()
  @IsEnum(CryptoTokenEnum)
  token: CryptoTokenEnum;

  @ApiProperty({
    description: 'The chain which user wants to get its token balance on',
    required: true,
  })
  @IsNumberString()
  @IsNotEmpty()
  chain: string;
}
