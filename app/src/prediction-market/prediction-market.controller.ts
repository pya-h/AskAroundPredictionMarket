import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import { GetConditionalTokenBalanceQuery } from './dto/get-ct-balance.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { ResolvePredictionMarketDto } from './dto/resolve-market.dto';
import { CreatePredictionMarketCategoryDto } from './dto/create-category.dto';
import { UpdatePredictionMarketCategoryDto } from './dto/update-category-data.dto';

@ApiTags('Omen Arena', 'Prediction Market')
@ApiSecurity('X-Api-Key')
@Controller('prediction-market')
export class PredictionMarketController {
  constructor(
    private readonly predictionMarketService: PredictionMarketService,
  ) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ description: 'Creates a new prediction market category' })
  @ApiBearerAuth()
  @Post('category')
  createNewCategory(
    @Body()
    {
      name,
      description = null,
      icon = null,
      parentId = null,
    }: CreatePredictionMarketCategoryDto,
  ) {
    return this.predictionMarketService.addNewCategory(
      name,
      description,
      icon,
      parentId,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ description: 'Update an existing added category data' })
  @ApiBearerAuth()
  @Patch('category/:id')
  updateCategoryData(
    @Param('id', ParseIntPipe) id: string,
    @Body()
    partialCategoryData: UpdatePredictionMarketCategoryDto,
  ) {
    return this.predictionMarketService.updateCategoryData(
      +id,
      partialCategoryData,
    );
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({ description: 'Delete an existing category' })
  @ApiBearerAuth()
  @Delete('category/:id')
  async deleteCategory(@Param('id', ParseIntPipe) id: string) {
    await this.predictionMarketService.deleteCategory(+id);
    return 'OK';
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @Get('category')
  findCategories(@Query('tree') tree: boolean) {
    return this.predictionMarketService.findCategories({
      relations: ['subCategories'],
      treeView: tree,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Creates a new prediction market' })
  @ApiBearerAuth()
  @Get('category/:id')
  getCategory(@Param('id', ParseIntPipe) categoryId: string) {
    return this.predictionMarketService.getCategory(+categoryId, {
      relations: ['parent', 'subCategories'],
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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
    if (resolveAt <= new Date())
      throw new BadRequestException('Resolve date has passed already!');
    return this.predictionMarketService.createNewMarket(
      question,
      outcomes,
      initialLiquidity,
      resolveAt,
      categoryId,
      subject,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Get all prediction markets available.' })
  @ApiBearerAuth()
  @Get()
  getMarkets(@Query() marketFeatures?: GetMarketsQuery) {
    return this.predictionMarketService.findMarkets(marketFeatures);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Get the price of a specific conditional token [or all of them] in a specific market',
  })
  @ApiBearerAuth()
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Get a specific prediction market' })
  @ApiBearerAuth()
  @Get(':id')
  getSpecificMarket(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarket(+id, 'outcomeTokens');
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ description: 'Get a specific prediction market' })
  @ApiBearerAuth()
  @Get(':id/liquidity')
  getMarketLiquidity(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarketLiquidity(+id);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Get the price of a specific conditional token [or all of them] in a specific market',
  })
  @ApiBearerAuth()
  @Get(':id/ctf/price')
  getConditionalTokenPrices(
    @Param('id', ParseIntPipe) marketId: string,
    @Query() { outcome }: GetConditionalTokenBalanceQuery,
  ) {
    return !outcome
      ? this.predictionMarketService.getAllOutcomesPrices(+marketId)
      : this.predictionMarketService.getSingleOutcomePrice(+marketId, +outcome);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Get the price of a specific conditional token [or all of them] in a specific market',
  })
  @ApiBearerAuth()
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Get the price of a specific conditional token [or all of them] in a specific market',
  })
  @ApiBearerAuth()
  @Get(':id/ctf/stats')
  getConditionalTokensStatus(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.getMarketParticipationStatistics(
      +marketId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Buy a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @Post('ctf/buy')
  buyOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalTokenDto,
  ) {
    return this.predictionMarketService.trade({
      ...tradeTokenDto,
      traderId: user.id,
    });
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description:
      'Sell a specific amount of a specific conditional token of a market',
  })
  @ApiBearerAuth()
  @Post('ctf/sell')
  sellOutcomeToken(
    @CurrentUser() user: User,
    @Body() tradeTokenDto: TradeConditionalTokenDto,
  ) {
    tradeTokenDto.amount *= -1;
    return this.predictionMarketService.trade({
      ...tradeTokenDto,
      traderId: user.id,
    });
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @ApiBearerAuth()
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
      forceClose = false,
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
      forceClose,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    description: 'Manually close and resolve a market.',
  })
  @ApiBearerAuth()
  @Post(':id/redeem')
  redeemRewards(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) marketId: string,
  ) {
    return this.predictionMarketService.redeemUserRewards(user, +marketId);
  }
}
