import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinaryPredictionModule } from './binary-prediction/binary-prediction.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';
import { postgresTypeormConfig } from './config/db.config';

@Module({
  imports: [
    BinaryPredictionModule,
    BlockchainModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        ... postgresTypeormConfig(configService),
        type: 'postgres',
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
