import { Module } from '@nestjs/common';
import { FileUploadService } from './file-upload.service';
import { FileUploadController } from './file-upload.controller';
import { MinioModule } from '../minio/minio.module';
import { PredictionMarketModule } from '../prediction-market/prediction-market.module';

@Module({
  imports: [MinioModule, PredictionMarketModule],
  providers: [FileUploadService],
  controllers: [FileUploadController],
})
export class FileUploadModule {}
