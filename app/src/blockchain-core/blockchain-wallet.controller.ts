import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  OmitType,
} from '@nestjs/swagger';
import { CreateBlockchainWalletDto } from './dtos/create-blockchain-wallet.dto';
import { User } from '../user/entities/user.entity';
import { BlockchainWalletService } from './blockchain-wallet.service';
import { GetCryptocurrencyBalanceDto } from './dtos/get-cryptocurrency-balance.dto';
import { ReceiveFreeNativeTokensDto } from './dtos/receive-free-native-tokens.dto';
import { BlockchainWallet } from './entities/blockchain-wallet.entity';
import { ApiStandardOkResponse } from 'src/core/decorators/api-standard-ok-response.decorator';
import { FaucetResponseDto } from './dtos/response/faucet-response.dto';
import { ChargeBlockchainWalletDto } from './dtos/charge-user-wallet.dto';
import { HideBlockchainWalletsPrivateData } from './interceptors/hide-wallet-private-info.interceptor';
import { ConvertNativeTokenToOthersDto } from './dtos/convert-native-to-token.dto';
import { NoPersonalUserDataInterceptor } from 'src/core/interceptors/serialize-user-data.interceptor';
import { BlockchainTransactionLog } from './entities/transaction-log.entity';
import { GetBlockchainTransactionHistoryOptionsDto } from './dtos/get-transaction-history-options.dto';
import { AuthGuard } from 'src/user/guards/auth.guard';
import { CurrentUser } from 'src/user/decorators/current-user.decorator';

@ApiTags('Omen Arena', 'Blockchain Wallet')
@ApiSecurity('X-Api-Key')
@Controller('blockchain-wallet')
export class BlockchainWalletController {
  constructor(
    private readonly blockchainWalletService: BlockchainWalletService,
  ) {}

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get a specific user wallet encrypted data.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(BlockchainWallet)
  @ApiStandardOkResponse([BlockchainTransactionLog])
  @NoPersonalUserDataInterceptor('user')
  @Get('user/:id/tx-history')
  getUserTransactionHistory(
    @Param('id', ParseIntPipe) targetId: string,
    @Query()
    getTransactionHistoryQueryParams: GetBlockchainTransactionHistoryOptionsDto,
  ) {
    return this.blockchainWalletService.getUserTransactions(+targetId, {
      relations: ['token', 'user'],
      ...getTransactionHistoryQueryParams,
    });
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get wallet balance of a specific cryptocurrency token',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', {
    description:
      'Result is actually a BigNumber instance, which is converted to string to prevent number overflow',
  })
  @Get(':token/:chain/balance')
  async getConditionalTokensStatus(
    @CurrentUser() user: User,
    @Param() { token, chain }: GetCryptocurrencyBalanceDto,
  ) {
    return (
      await this.blockchainWalletService.getBalance(user.id, token, +chain)
    )?.balance;
  }

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
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

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      "Convert a chain's specific token to another token like oracle.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(OmitType(FaucetResponseDto, ['amount']))
  @Post('convert')
  convertNativeTokenToOther(
    @CurrentUser() user: User,
    @Body()
    { chain, token, amount, targetId = null }: ConvertNativeTokenToOthersDto,
  ) {
    return this.blockchainWalletService.convertNativeTokenToOther(
      targetId != null ? targetId : user.id,
      chain,
      token,
      amount,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get user transactions',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([BlockchainTransactionLog])
  @NoPersonalUserDataInterceptor('user')
  @Get('tx-history')
  getTransactionHistory(
    @CurrentUser() user: User,
    @Query()
    getTransactionHistoryQueryParams: GetBlockchainTransactionHistoryOptionsDto,
  ) {
    return this.blockchainWalletService.getUserTransactions(user.id, {
      relations: ['token', 'user'],
      ...getTransactionHistoryQueryParams,
    });
  }
}
