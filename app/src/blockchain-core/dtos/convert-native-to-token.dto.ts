import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { ChargeBlockchainWalletDto } from './charge-user-wallet.dto';
import { CryptoTokenEnum } from '../enums/crypto-token.enum';
import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';
import { IsEnumDetailed } from '../../core/decorators/is-enum-detailed.decorator';

export class ConvertNativeTokenToOthersDto extends OmitType(
  ChargeBlockchainWalletDto,
  ['target'],
) {
  @ApiProperty({
    description: 'The cryptocurrency which native token should convert to.',
    required: true,
    enum: CryptoTokenEnum,
    enumName: 'CryptoTokenEnum',
  })
  @IsNotEmpty()
  @IsEnumDetailed(CryptoTokenEnum, 'Target token')
  token: CryptoTokenEnum;

  @ApiPropertyOptional({
    description:
      'Target user id which the token conversion will happen on its wallet; Otherwise the conversion will happen for the admin wallet itself.',
    required: false,
  })
  @IsInt()
  @IsOptional()
  targetId?: number;
}
