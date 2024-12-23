import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { CreateBlockchainWalletDto } from './dtos/create-blockchain-wallet.dto';
import { User } from '../user/entities/user.entity';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { GetCryptocurrencyBalanceDto } from './dtos/get-cryptocurrency-balance.dto';
import { CurrentUser } from '../user/decorators/current-user.decorator';

@ApiTags('Omen Arena', 'Blockchain Wallet')
@ApiSecurity('X-Api-Key')
@Controller('blockchain-wallet')
export class BlockchainWalletController {
  constructor(
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {}

  @ApiOperation({
    description: 'Get a specific user wallet encrypted data.',
  })
  @ApiBearerAuth()
  @Get('user/:id')
  getWallet(@Param('id', ParseIntPipe) targetId: string) {
    return this.blockchainWalletService.getWallet(+targetId, true);
  }

  @ApiOperation({
    description: 'Get wallet balance of a specific cryptocurrency token',
  })
  @ApiBearerAuth()
  @Get(':token/:chain/balance')
  getConditionalTokensStatus(
    @CurrentUser() user: User,
    @Param() { token, chain }: GetCryptocurrencyBalanceDto,
  ) {
    return this.blockchainWalletService.getBalance(user.id, token, +chain);
  }

  @ApiOperation({
    description:
      'Admin endpoint to directly set a specific user blockchain wallet data.',
  })
  @ApiBearerAuth()
  @Post('connect')
  async setUserBlockchainWalletData(
    @Body() walletData: CreateBlockchainWalletDto,
  ) {
    await this.blockchainWalletService.manuallyConnectWallet(
      walletData.userId,
      walletData.walletAddress,
      walletData.secret,
    );
    return 'OK';
  }
}
