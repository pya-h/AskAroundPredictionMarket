import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Market } from './markets/market.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'prediction_market',
      entities: [Market],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([Market]),
  ],
})
export class AppModule {}
