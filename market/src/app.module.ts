import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BinaryPredictionModule } from './binary-prediction/binary-prediction.module';
import { BlockchainModule } from './blockchain/blockchain.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';

@Module({
  imports: [
    BinaryPredictionModule,
    BlockchainModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST,
      port: 5432,
      username: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      entities: [join(__dirname, '..', '**', '*.entity{.ts,.js}')],
      migrations: [join(__dirname, '..', 'migrations', '*{.ts,.js}')],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
