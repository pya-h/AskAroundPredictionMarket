import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  OmitType,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateBlockchainWalletDto } from './dtos/create-blockchain-wallet.dto';
import { User } from '../user/entities/user.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { GetCryptocurrencyBalanceDto } from './dtos/get-cryptocurrency-balance.dto';
import { AdminGuard } from 'src/guards/admin.guard';
import { ReceiveFreeNativeTokensDto } from './dtos/receive-free-native-tokens.dto';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { ApiStandardOkResponse } from 'src/core/decorators/api-standard-ok-response.decorator';
import { FaucetResponseDto } from './dtos/response/faucet-response.dto';
import { ChargeBlockchainWalletDto } from './dtos/charge-user-wallet.dto';
import { HideBlockchainWalletsPrivateData } from './interceptors/hide-wallet-private-info.interceptor';
import { ConvertNativeTokenToOthersDto } from './dtos/convert-native-to-token.dto';

@ApiTags('Omen Arena', 'Blockchain Wallet')
@ApiSecurity('X-Api-Key')
@Controller('blockchain-wallet')
export class BlockchainWalletController {
  constructor(
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    description: 'Get a specific user wallet encrypted data.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(BlockchainWallet)
  @HideBlockchainWalletsPrivateData()
  @Get('user/:id')
  getWallet(@Param('id', ParseIntPipe) targetId: string) {
    return this.blockchainWalletService.getWallet(+targetId, {
      throwIfNotFound: true,
      relations: ['user'],
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: 'Get wallet balance of a specific cryptocurrency token',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', {
    description:
      'Result is actually a BigNumber instance, which is converted to string to prevent number overflow',
  })
  @Get(':token/:chain/balance')
  getConditionalTokensStatus(
    @CurrentUser() user: User,
    @Param() { token, chain }: GetCryptocurrencyBalanceDto,
  ) {
    return this.blockchainWalletService.getBalance(user.id, token, +chain);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    description:
      'Admin endpoint to directly set a specific user blockchain wallet data.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string')
  @Post('connect')
  async setUserBlockchainWalletData(
    @Body() walletData: CreateBlockchainWalletDto,
  ) {
    await this.blockchainWalletService.manuallyConnectWallet(
      walletData.userId,
      walletData.walletAddress,
      walletData.secret,
      walletData.force,
    );
    return 'OK';
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: 'Get free native tokens of a specific chain.',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiStandardOkResponse(FaucetResponseDto)
  @Post('faucet')
  faucet(
    @CurrentUser() user: User,
    @Body() { chain }: ReceiveFreeNativeTokensDto,
  ) {
    return this.blockchainWalletService.getFreeDefaultToken(user, chain);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    description:
      'Charge special amount of chain native tokens to a special user.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(OmitType(FaucetResponseDto, ['amount']))
  @Post('charge')
  chargeUserWallet(
    @Body() { chain, target, amount }: ChargeBlockchainWalletDto,
  ) {
    return this.blockchainWalletService.chargeUserWallet(target, amount, chain);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    description:
      "Convert a chain's specific token to another token like oracle.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(OmitType(FaucetResponseDto, ['amount']))
  @Post('convert')
  convertNativeTokenToOther(
    @CurrentUser() user: User,
    @Body() { chain, token, amount }: ConvertNativeTokenToOthersDto,
  ) {
    return this.blockchainWalletService.convertNativeTokenToOther(
      user.id,
      chain,
      token,
      amount,
    );
  }
}
