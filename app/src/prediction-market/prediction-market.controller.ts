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
import { CurrentUser } from '../user/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import { GetConditionalTokenBalanceQuery } from './dto/get-ct-balance.dto';

@Controller('prediction-market')
export class PredictionMarketController {
  constructor(
    private readonly predictionMarketService: PredictionMarketService,
  ) {}

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

  @Get()
  getMarkets(@Query() marketFeatures?: GetMarketsQuery) {
    return this.predictionMarketService.findMarkets(marketFeatures);
  }

  @Get(':id')
  getSpecificMarket(@Param('id', ParseIntPipe) id: string) {
    return this.predictionMarketService.getMarket(+id);
  }

  // TODO: Patch endpoint

  // TODO: Delete endpoint (softDelete actually)

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

  @Get('ctf/balance')
  getConditionalTokenBalance(
    @CurrentUser() user: User,
    @Query() { market, outcome }: GetConditionalTokenBalanceQuery,
  ) {
    return this.predictionMarketService.getConditionalTokenBalance(
      user,
      +market,
      +outcome,
    );
  }
}
