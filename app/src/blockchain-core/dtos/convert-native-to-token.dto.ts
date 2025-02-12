import { ApiProperty, OmitType } from '@nestjs/swagger';
import { ChargeBlockchainWalletDto } from './charge-user-wallet.dto';
import { CryptoTokenEnum } from '../enums/crypto-token.enum';
import { IsNotEmpty } from 'class-validator';
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
}
