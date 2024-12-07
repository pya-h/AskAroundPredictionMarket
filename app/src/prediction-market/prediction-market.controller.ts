import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { PredictionMarketService } from './prediction-market.service';
import { CreatePredictionMarketDto } from './dto/create-market.dto';
import { GetMarketsQuery } from './dto/get-markets.dto';
import { TradeConditionalToken } from './dto/trade-ctf.dto';

import { User } from '../user/entities/user.entity';
import { GetConditionalTokenBalanceQuery } from './dto/get-ct-balance.dto';
import { CurrentUser } from '../user/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Omen Arena', 'Prediction Market')
@ApiSecurity('X-Api-Key')
@Controller('prediction-market')
export class PredictionMarketController {
  constructor(
    private readonly predictionMarketService: PredictionMarketService,
  ) {}

  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @Post()
  createNewMarket(
    @Body()
    {
      question,
      initialLiquidity,
      outcomes,
      resolveAt,
      categoryId = null,
      subject = null,
    }: CreatePredictionMarketDto,
  ) {
    return this.predictionMarketService.createNewMarket(
      question,
      outcomes,
      initialLiquidity,
      resolveAt,
      categoryId,
      subject,
    );
  }

  @ApiOperation({ description: 'Get all prediction markets available.' })
  @ApiBearerAuth()
  @Get()
  getMarkets(@Query() marketFeatures?: GetMarketsQuery) {
    return this.predictionMarketService.findMarkets(marketFeatures);
  }

  @ApiOperation({ description: 'Get a specific prediction market' })
  @ApiBearerAuth()
  @Get(':id')
  getSpecificMarket(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarket(+id, 'outcomeTokens');
  }

  @ApiOperation({ description: 'Get a specific prediction market' })
  @ApiBearerAuth()
  @Get(':id/liquidity')
  getMarketLiquidity(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarketLiquidity(+id);
  }

  @ApiOperation({
    description:
      "Get user's balance of a specific conditional token [or all of them] in a specific market",
  })
  @ApiBearerAuth()
  @Get(':id/ctf/balance')
  getConditionalTokenBalance(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome }: GetConditionalTokenBalanceQuery,
  ) {
    return !outcome
      ? this.predictionMarketService.getUserLiquidity(+marketId, user.id)
      : this.predictionMarketService.getConditionalTokenBalance(
          user,
          +marketId,
          +outcome,
        );
  }

  @ApiOperation({
    description:
      'Get the price of a specific conditional token [or all of them] in a specific market',
  })
  @ApiBearerAuth()
  @Get(':id/ctf/price')
  getConditionalTokenMarginalPrices(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome }: GetConditionalTokenBalanceQuery,
  ) {
    return !outcome
      ? this.predictionMarketService.getMarketOutcomesMarginalPrices(+marketId)
      : this.predictionMarketService.getConditionalTokenMarginalPrices(
          +marketId,
          +outcome,
        );
  }

  // TODO: Patch endpoint

  // TODO: Delete endpoint (softDelete actually)

  @ApiOperation({
    description:
      'Buy a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @Post('ctf/buy')
  buyOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalToken,
  ) {
    return this.predictionMarketService.trade({
      ...tradeTokenDto,
      traderId: user.id,
    });
  }

  @ApiOperation({
    description:
      'Sell a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @Post('ctf/sell')
  sellOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalToken,
  ) {
    tradeTokenDto.amount *= -1;
    return this.predictionMarketService.trade({
      ...tradeTokenDto,
      traderId: user.id,
    });
  }

  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @ApiBearerAuth()
  @Post(':id/force-close')
  forceCloseMarket(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.forceCloseMarket(user, +marketId);
  }
}
