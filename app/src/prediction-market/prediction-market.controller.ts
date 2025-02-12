import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PredictionMarketService } from './prediction-market.service';
import { CreatePredictionMarketDto } from './dto/create-market.dto';
import { GetMarketsQuery } from './dto/get-markets.dto';
import { TradeConditionalTokenDto } from './dto/trade-ctf.dto';
import { User } from '../user/entities/user.entity';
import {
  GetConditionalTokenBalanceQuery,
  WhatYouGetQuery,
} from './dto/get-ct.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { ResolvePredictionMarketDto } from './dto/resolve-market.dto';
import { CreatePredictionMarketCategoryDto } from './dto/create-category.dto';
import { UpdatePredictionMarketCategoryDto } from './dto/update-category-data.dto';
import { NoPersonalUserDataInterceptor } from '../core/interceptors/serialize-user-data.interceptor';
import { ApiStandardOkResponse } from '../core/decorators/api-standard-ok-response.decorator';
import {
  PredictionMarketExtraDto,
  PredictionMarketExtraWithExtraStatisticsDto,
  UserMarketsListResponseDto,
} from './dto/responses/prediction-market-extra.dto';
import { MarketCategory } from './entities/market-category.entity';
import { RedeemResultDto } from './dto/responses/redeem-result.dto';
import { TransactionReceiptDto } from '../blockchain-core/dtos/response/transaction-receipt.dto';
import {
  OutcomeTokenBalanceInfo,
  OutcomeTokenParticipationInfo,
  OutcomeTokenPriceInfo,
} from './dto/responses/outcome-token-stats.dtos';
import { HideBlockchainWalletsPrivateData } from '../blockchain-core/interceptors/hide-wallet-private-info.interceptor';
import {
  TotalTradeOptionsDto,
  TradeHistoryOptionsDto,
} from './dto/get-my-trades.dto';
import { PredictionMarketParticipation } from './entities/participation.entity';
import {
  GeneralParticipationStatisticsDto,
  UserParticipationStatisticsDto,
} from './dto/responses/participation-statistics.dto';
import { TotalPerOutcomeTradeStatisticsDto } from './dto/responses/total-trade-statistics.dto';
import { GetConditionalTokenPriceQuery } from './dto/get-ct-price.dto';
import { CryptoTokenEnum } from '../blockchain-core/enums/crypto-token.enum';
import { PaginationOptionsDto } from '../core/dtos/pagination-options.dto';
import { Oracle } from './entities/oracle.entity';
import { BasePredictionMarket } from './entities/bases/base-market.entity';
import { GetReservedMarketsQuery } from './dto/get-reserved-markets.dto';
import {
  BasePredictionMarketExtraDto,
  BasePredictionMarketExtraWithFlagDto,
} from './dto/responses/base-market-extra.dto';
import { UpdateReservedPredictionMarketDto } from './dto/update-reserved-market.dto';
import { UpdatePredictionMarketDto } from './dto/update-market.dto';
import { PredictionMarket } from './entities/market.entity';
import { OutcomeTradeResponseDto } from './dto/responses/outcome-trade-response.dto';
import { GetUserMarketsDto } from './dto/get-user-markets.dto';
import { AuthGuard } from '../user/guards/auth.guard';
import { CurrentUser } from '../user/decorators/current-user.decorator';

@ApiTags('Prediction Market')
@ApiSecurity('X-Api-Key')
@Controller('prediction-market')
export class PredictionMarketController {
  constructor(
    private readonly predictionMarketService: PredictionMarketService,
  ) {}

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market category' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(MarketCategory)
  @Post('category')
  async createNewCategory(
    @Body()
    {
      name,
      description = null,
      icon = null,
      parentId = null,
    }: CreatePredictionMarketCategoryDto,
  ) {
    return this.predictionMarketService.recursiveSyncMarketCategoryIconUrl(
      await this.predictionMarketService.addNewCategory(
        name,
        description,
        icon,
        parentId,
      ),
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Update an existing category data' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(MarketCategory)
  @Patch('category/:id')
  async updateCategoryData(
    @Param('id', ParseIntPipe) id: string,
    @Body()
    partialCategoryData: UpdatePredictionMarketCategoryDto,
  ) {
    return this.predictionMarketService.recursiveSyncMarketCategoryIconUrl(
      await this.predictionMarketService.updateCategoryData(
        +id,
        partialCategoryData,
      ),
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Delete an existing category' })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', { default: 'OK' })
  @Delete('category/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: string) {
    await this.predictionMarketService.deleteCategory(+id);
    return 'OK';
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @ApiStandardOkResponse([MarketCategory])
  @Get('category')
  async findCategories(@Query('tree') tree: boolean) {
    return Promise.all(
      (
        await this.predictionMarketService.findCategories({
          relations: ['subCategories'],
          treeView: tree,
        })
      ).map((category) =>
        this.predictionMarketService.recursiveSyncMarketCategoryIconUrl(
          category,
          false,
        ),
      ),
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(MarketCategory)
  @Get('category/:id')
  async getCategory(@Param('id', ParseIntPipe) categoryId: string) {
    return this.predictionMarketService.recursiveSyncMarketCategoryIconUrl(
      await this.predictionMarketService.getCategory(+categoryId, {
        relations: ['parent', 'subCategories'],
        shouldThrow: true,
      }),
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: "List market's supported oracles." })
  @ApiBearerAuth()
  @HideBlockchainWalletsPrivateData('account')
  @ApiStandardOkResponse([Oracle])
  @Get('oracle')
  async findOracles(@Query() paginationOptionsDto?: PaginationOptionsDto) {
    return this.predictionMarketService.findOracles(paginationOptionsDto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Get a specific oracle data.' })
  @ApiBearerAuth()
  @HideBlockchainWalletsPrivateData('account')
  @ApiStandardOkResponse(Oracle)
  @Get('oracle/:id')
  async getOracle(@Param('id', ParseIntPipe) oracleId: string) {
    return this.predictionMarketService.getOracle(+oracleId, {
      shouldThrow: true,
    });
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @NoPersonalUserDataInterceptor('creator')
  @HideBlockchainWalletsPrivateData('oracle', 'account')
  @ApiStandardOkResponse(BasePredictionMarket)
  @Post()
  async createNewMarket(
    @CurrentUser() user: User,
    @Body()
    {
      question,
      initialLiquidity,
      outcomes,
      startAt = null,
      resolveAt,
      categoryId,
      creatorId = null,
      ...extraInfo
    }: CreatePredictionMarketDto,
  ) {
    if (resolveAt <= new Date())
      throw new BadRequestException('Resolve date has passed already!');
    const baseMarketData = await this.predictionMarketService.createNewMarket(
      question,
      outcomes,
      initialLiquidity,
      resolveAt,
      categoryId,
      creatorId || user.id,
      startAt,
      {
        ...extraInfo,
        collateralToken: extraInfo.collateralToken as CryptoTokenEnum,
      },
    );
    await this.predictionMarketService.syncPredictionMarketImageUrl(
      baseMarketData,
    );
    return baseMarketData;
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Get all prediction markets available.' })
  @ApiBearerAuth()
  @Get()
  @ApiStandardOkResponse([PredictionMarketExtraDto])
  @NoPersonalUserDataInterceptor('creator')
  @HideBlockchainWalletsPrivateData('oracle', 'account')
  async getMarkets(@Query() marketFeatures?: GetMarketsQuery) {
    const minioCache = { categories: {} };
    return (
      await Promise.all(
        (
          await this.predictionMarketService.findMarkets(
            marketFeatures,
            'outcomeTokens',
            'creator',
            'oracle',
          )
        ).map(async (market) => {
          if (minioCache.categories[market.categoryId]) {
            market.category.icon = minioCache.categories[market.categoryId];
          }

          await this.predictionMarketService.syncMinioUrls<PredictionMarket>(
            market,
            {
              loadCategoryIcon: !minioCache.categories[market.categoryId],
            },
          );

          if (
            market.category?.icon &&
            !minioCache.categories[market.categoryId]
          ) {
            minioCache.categories[market.categoryId] = market.category.icon;
          }

          return market;
        }),
      )
    ).map((market) => ({
      ...market,
      statistics: market.statistics,
      totalInvestment: market.totalInvestment,
      status: market.status,
      isReserved: false,
    }));
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get all prediction markets reserved to start at future.',
  })
  @ApiBearerAuth()
  @Get('reserved')
  @ApiStandardOkResponse([BasePredictionMarketExtraWithFlagDto])
  @NoPersonalUserDataInterceptor('creator')
  @HideBlockchainWalletsPrivateData('oracle', 'account')
  async getReservedMarkets(@Query() marketFeatures?: GetReservedMarketsQuery) {
    const reservedMarkets = await Promise.all(
      await this.predictionMarketService.findReservedPredictionMarkets(
        marketFeatures,
        'creator',
        'oracle',
      ),
    );

    const minioCache = { categories: {}, avatars: {} };
    await Promise.all(
      reservedMarkets.map((market) => {
        if (minioCache.categories[market.categoryId]) {
          market.category.icon = minioCache.categories[market.categoryId];
        }

        this.predictionMarketService.syncMinioUrls<BasePredictionMarketExtraDto>(
          market,
          {
            loadCreatorAvatar: !minioCache.avatars[market.creatorId],
            loadCategoryIcon: !minioCache.categories[market.categoryId],
          },
        );

        if (
          market.category?.icon &&
          !minioCache.categories[market.categoryId]
        ) {
          minioCache.categories[market.categoryId] = market.category.icon;
        }
        return reservedMarkets;
      }),
    );
    return reservedMarkets.map((rm) => ({ ...rm, isReserved: true }));
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Get a specific reserved prediction market; Do not mistake reserved market id with casual market id!',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(BasePredictionMarketExtraWithFlagDto)
  @Get('reserved/:id')
  @NoPersonalUserDataInterceptor('creator')
  @HideBlockchainWalletsPrivateData('oracle', 'account')
  async getSpecificReservedMarket(@Param('id', ParseIntPipe) id: string) {
    const market =
      await this.predictionMarketService.getReservedPredictionMarket(
        +id,
        'creator',
        'oracle',
      );
    await this.predictionMarketService.syncMinioUrls<BasePredictionMarketExtraDto>(
      market,
    );
    market['isReserved'] = true;
    return market;
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Update a reserved market data' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(BasePredictionMarketExtraWithFlagDto)
  @Patch('reserved/:id')
  async updateReservedPredictionMarketData(
    @Param('id', ParseIntPipe) id: string,
    @Body()
    partialReservedMarketData: UpdateReservedPredictionMarketDto,
  ) {
    const updatedReservedMarket =
      await this.predictionMarketService.updateReservedPredictionMarketData(
        +id,
        partialReservedMarketData,
      );
    await this.predictionMarketService.syncMinioUrls<BasePredictionMarketExtraDto>(
      updatedReservedMarket,
    );
    updatedReservedMarket['isReserved'] = true;
    return updatedReservedMarket;
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Remove a specific reserved market; Do not mistake reserved market id with casual market id!',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', { default: 'OK' })
  @Delete('reserved/:id')
  async deleteReservedPredictionMarket(@Param('id', ParseIntPipe) id: string) {
    await this.predictionMarketService.softRemoveReservedPredictionMarket(+id);
    return 'OK';
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get market collateral amount in its pool.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenBalanceInfo])
  @Get(':id/collateral/liquidity')
  getMarketCollateralLiquidity(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarketEquivalentCollateralBalance(
      +id,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Get the price of a specific conditional tokens in a specific market',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', {
    example: '1.000000000000000001',
    description:
      'Result is actually a BigNumber instance, which is converted to string to prevent number overflow',
  })
  @Get(':id/collateral/balance')
  getUserCollateralBalance(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.getUserBalanceOfMarketCollateralToken(
      user.id,
      +marketId,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Get the liquidity pool of a market, showing amounts of each outcome.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenBalanceInfo])
  @Get(':id/ctf/liquidity')
  getMarketOutcomeLiquidity(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarketLiquidity(+id);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      "Get user's balance of conditional tokens in a market; It returns a numeric string if you specify outcome in query param.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenBalanceInfo])
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

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Get the prices of conditional tokens in a market; It returns a numeric string if you specify outcome in query param.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenPriceInfo])
  @Get(':id/ctf/price')
  getConditionalTokenPrices(
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome, amount = '1' }: GetConditionalTokenPriceQuery,
  ) {
    return !outcome
      ? this.predictionMarketService.getAllOutcomesPrices(+marketId, +amount)
      : this.predictionMarketService.getSingleOutcomePrice(
          +marketId,
          +outcome,
          +amount,
        );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Get the marginal prices of conditional tokens in a market; It returns a numeric string if you specify outcome in query param.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenPriceInfo])
  @Get(':id/ctf/marginal-price')
  getConditionalTokenMarginalPrice(
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome }: GetConditionalTokenBalanceQuery,
  ) {
    return !outcome
      ? this.predictionMarketService.getAllOutcomesMarginalPrices(+marketId)
      : this.predictionMarketService.getSingleOutcomeMarginalPrice(
          +marketId,
          +outcome,
        );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get the participation stats on market outcomes',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([OutcomeTokenParticipationInfo])
  @Get(':id/ctf/stats')
  getConditionalTokensStatus(@Param('id', ParseIntPipe) marketId: string) {
    return this.predictionMarketService.getMarketParticipationStatistics(
      +marketId,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get user's participation statistics (in all markets) so far.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(UserParticipationStatisticsDto)
  @Get('my-participation-stats')
  getUserParticipationStatistics(@CurrentUser() user: User) {
    return this.predictionMarketService.getUserParticipationStatistics(user.id);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Get OmenArena participation statistics so far.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse(GeneralParticipationStatisticsDto)
  @Get('participation-stats')
  getGeneralStatistics() {
    return this.predictionMarketService.getGeneralParticipationStatistics();
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get user's trade history so far.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([PredictionMarketParticipation])
  @Get('my-trades')
  getMyAllTrades(
    @CurrentUser() user: User,
    @Query() userTradeHistoryDto: TradeHistoryOptionsDto,
  ) {
    return this.predictionMarketService.findUserTrades(
      user.id,
      userTradeHistoryDto,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get sum of user's trades so far.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([TotalPerOutcomeTradeStatisticsDto])
  @Get('my-trades/total')
  getMyAllTradesTotal(
    @CurrentUser() user: User,
    @Query() userTradeHistoryDto: TotalTradeOptionsDto,
  ) {
    return this.predictionMarketService.getUserTotalTrades(
      user.id,
      userTradeHistoryDto,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get sum of user's trades so far.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([UserMarketsListResponseDto])
  @Get('my-markets')
  getMyMarkets(
    @CurrentUser() user: User,
    @Query() getUserMarketsDto: GetUserMarketsDto,
  ) {
    return this.predictionMarketService.findUserMarkets(
      user.id,
      getUserMarketsDto,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get user's trade history so far in a specific market.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([PredictionMarketParticipation])
  @Get(':id/my-trades')
  getMyMarketTrades(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
    @Query() userTradeHistoryDto: TradeHistoryOptionsDto,
  ) {
    return this.predictionMarketService.findUserTrades(user.id, {
      ...userTradeHistoryDto,
      marketId: +marketId,
    });
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: "Get sum of user's trade in a specific market",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse([TotalPerOutcomeTradeStatisticsDto])
  @Get(':id/my-trades/total')
  getMyMarketTradesTotal(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
    @Query() userTradeHistoryDto: TotalTradeOptionsDto,
  ) {
    return this.predictionMarketService.getUserTotalTrades(user.id, {
      ...userTradeHistoryDto,
      marketId: +marketId,
    });
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Buy a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiStandardOkResponse(OutcomeTradeResponseDto)
  @Post('ctf/buy')
  buyOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalTokenDto,
  ) {
    return this.predictionMarketService.trade(user.id, tradeTokenDto);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Sell a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiStandardOkResponse(OutcomeTradeResponseDto)
  @Post('ctf/sell')
  async sellOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalTokenDto,
  ) {
    if (tradeTokenDto.amount != null) {
      await this.predictionMarketService.checkCanSell(
        user,
        tradeTokenDto.marketId,
        tradeTokenDto.outcomeIndex,
        tradeTokenDto.amount,
      );
    }

    return this.predictionMarketService.trade(user.id, tradeTokenDto, true);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      "Get user's balance of conditional tokens in a market; It returns a numeric string if you specify outcome in query param.",
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('number')
  @Get(':id/ctf/whatuget')
  async whatYouGet(
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome, payment }: WhatYouGetQuery,
  ) {
    return this.predictionMarketService.calculatePurchasableTokens(
      +marketId,
      outcome,
      payment,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @Post(':id/force-close')
  forceCloseMarket(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.forceCloseMarket(user, +marketId);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiStandardOkResponse(TransactionReceiptDto)
  @Post(':id/resolve')
  manualResolveMarket(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
    @Body()
    resolveMarketDto: ResolvePredictionMarketDto,
  ) {
    const {
      correctOutcome = null,
      truenessRato = null,
      force = false,
    } = resolveMarketDto;
    if (
      (correctOutcome != null && truenessRato != null) ||
      (correctOutcome == null && truenessRato == null)
    )
      throw new BadRequestException(
        'Resolving market is only acceptable with exactly one approach: Specifying correct outcome value, or specifying trueness ratio array.',
      );

    return this.predictionMarketService.manualResolve(
      user,
      +marketId,
      truenessRato?.length ? truenessRato : correctOutcome,
      force,
    );
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiStandardOkResponse(RedeemResultDto)
  @Post(':id/redeem')
  redeemRewards(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.redeemUserRewards(user, +marketId);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Get a specific prediction market' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(PredictionMarketExtraWithExtraStatisticsDto)
  @Get(':id')
  @NoPersonalUserDataInterceptor('creator')
  @HideBlockchainWalletsPrivateData('oracle', 'account')
  async getSpecificMarket(@Param('id', ParseIntPipe) id: string) {
    const marketId = +id;
    const [market, participants, oraclePool] = await Promise.all([
      this.predictionMarketService.syncMinioUrls<PredictionMarket>(
        await this.predictionMarketService.getMarket(
          marketId,
          'outcomeTokens',
          'creator',
          'oracle',
        ),
      ),
      this.predictionMarketService.getNumberOfParticipants(marketId, 'market'),
      this.predictionMarketService.getMarketTotalOraclePool(marketId),
    ]);
    return {
      ...market,
      isReserved: false,
      participants,
      status: market.status,
      totalInvestment: market.totalInvestment,
      oraclePool,
      statistics: await Promise.all(
        market.statistics?.map(async (outcome) => ({
          ...outcome,
          participants:
            await this.predictionMarketService.getNumberOfParticipants(
              outcome.id,
              'outcome',
            ),
        })),
      ),
    };
  }

  @UseGuards(AuthGuard)
  @ApiOperation({ description: 'Update a reserved market data' })
  @ApiBearerAuth()
  @ApiStandardOkResponse(PredictionMarket)
  @Patch(':id')
  async updatePredictionMarketData(
    @Param('id', ParseIntPipe) id: string,
    @Body()
    partialMarketData: UpdatePredictionMarketDto,
  ) {
    const updatedMarket =
      await this.predictionMarketService.updatePredictionMarketData(
        +id,
        partialMarketData,
      );
    return this.predictionMarketService.syncMinioUrls(updatedMarket);
  }

  @UseGuards(AuthGuard)
  @ApiOperation({
    description:
      'Remove a specific prediction market (only data); Although market will still remain on blockchain; This endpoint just soft removes market data from database.',
  })
  @ApiBearerAuth()
  @ApiStandardOkResponse('string', { default: 'OK' })
  @Delete(':id')
  async deletePredictionMarket(@Param('id', ParseIntPipe) id: string) {
    await this.predictionMarketService.softRemovePredictionMarket(+id);
    return 'OK';
  }
}
