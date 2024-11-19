import { Body, Controller, Get, Post } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';
import { CreatePredictionMarketDto } from './dto/create-market.dto';

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
  getMarkets() {

  }
}
