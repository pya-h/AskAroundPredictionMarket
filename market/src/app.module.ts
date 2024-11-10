import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MarketModule } from './market/market.module';
import { BinaryPredictionModule } from './binary-prediction/binary-prediction.module';

@Module({
  imports: [MarketModule, BinaryPredictionModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
