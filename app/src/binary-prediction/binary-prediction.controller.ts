import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { CreatePredictionMarketDto } from './dto/create-market.dto';
import { GetMarketsQuery } from './dto/get-markets.dto';

@Controller('binary-prediction')
export class BinaryPredictionController {
  constructor(
    private readonly binaryPredictionService: BinaryPredictionService,
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
    return this.binaryPredictionService.createNewMarket(
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
    return this.binaryPredictionService.findMarkets(marketFeatures);
  }

  @Get(':id')
  getSpecificMarket(@Param('id', ParseIntPipe) id: string) {
    return this.binaryPredictionService.getMarket(+id);
  }

  // TODO: Patch endpoint

  // TODO: Delete endpoint (softDelete actually)
}
