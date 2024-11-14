import { Body, Controller, Post } from '@nestjs/common';
import { BinaryPredictionService } from './binary-prediction.service';

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
    }: {
      question: string;
      initialLiquidity: number;
      outcomes: string[];
    },
  ) {
    return this.binaryPredictionService.createNewMarket(
      question,
      outcomes,
      initialLiquidity,
    );
  }
}
