import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CreateBlockchainWalletDto } from './dtos/create-blockchain-wallet.dto';
import { User } from '../user/entities/user.entity';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { BlockchainWalletService } from './blockchain-wallet.service';

@ApiTags('Omen Arena', 'Blockchain Wallet')
@ApiSecurity('X-Api-Key')
@Controller('blockchain-wallet')
export class BlockchainWalletController {
  constructor(
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {}

  @ApiOperation({
    description:
      'Test endpoint to directly set user blockchain wallet data, to use prediction market endpoints.',
  })
  @ApiBearerAuth()
  @Post('connect')
  async setUserBlockchainWalletData(
    @CurrentUser() user: User,
    @Body() walletData: CreateBlockchainWalletDto,
  ) {
    await this.blockchainWalletService.createWallet(
      user.id,
      walletData.walletAddress,
      walletData.secret,
    );
    return 'OK';
  }
}
