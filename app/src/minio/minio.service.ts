// minio.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import * as Minio from 'minio';
import { extname } from 'path';
import { ConfigService } from '../config/config.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MinioService {
  private minioClient: Minio.Client;
  private static bucketNames = {
    predictionMarket: 'prediction-market',
    outcome: 'pm-outcome',
    predictionMarketCategory: 'pm-category',
  };

  get outcomeBucketName() {
    return MinioService.bucketNames.outcome;
  }

  get predictionMarketBucketName() {
    return MinioService.bucketNames.predictionMarket;
  }

  get predictionMarketCategoryBucketName() {
    return MinioService.bucketNames.predictionMarketCategory;
  }

  getUniqueFileName(file: Express.Multer.File) {
    return `${Date.now()}.${uuidv4()}${extname(file.originalname)}`;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly loggerService: LoggerService,
  ) {
    this.init().catch((ex) => {
      this.loggerService.error('Could not prepare minio service', ex as Error);
    });
  }

  async init() {
    const port = this.configService.get<number>('MINIO_PORT') || null;
    try {
      this.minioClient = new Minio.Client({
        endPoint: this.configService.getOrThrow<string>('MINIO_ENDPOINT'),
        accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
        secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
        useSSL: this.configService.get<boolean>('MINIO_SSL') || false,
        ...(port ? { port: +port } : {}),
      });

      for (const bucketName of Object.values(MinioService.bucketNames)) {
        const exists = await this.minioClient.bucketExists(bucketName);
        if (!exists) {
          await this.minioClient.makeBucket(bucketName, 'us-east-1');
        }
      }
    } catch (ex) {
      this.loggerService.error(
        'Failed loading minio credentials and thus client. This prevents users from seeing dynamic assets like their avatars.',
        ex,
      );
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    bucketName: string,
    prefixBucketName: boolean = true,
  ) {
    const filename = this.getUniqueFileName(file);
    return {
      filename: prefixBucketName ? `${bucketName}/${filename}` : filename,
      objectInfo: await this.minioClient.putObject(
        bucketName,
        filename,
        file.buffer,
        file.size,
        {
          'Content-Type': file.mimetype,
        },
      ),
    };
  }

  uploadPredictionMarketImage(file: Express.Multer.File) {
    return this.uploadFile(file, this.predictionMarketBucketName, false);
  }

  uploadOutcomeIcon(file: Express.Multer.File) {
    return this.uploadFile(file, this.outcomeBucketName, false);
  }

  uploadMarketCategoryIcon(file: Express.Multer.File) {
    return this.uploadFile(
      file,
      this.predictionMarketCategoryBucketName,
      false,
    );
  }

  getPredictionMarketImageUrl(fileName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.predictionMarketBucketName,
      fileName,
    );
  }

  getOutcomeIconUrl(fileName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.outcomeBucketName,
      fileName,
    );
  }

  getMarketCategoryIconUrl(fileName: string): Promise<string> {
    return this.minioClient.presignedGetObject(
      this.predictionMarketCategoryBucketName,
      fileName,
    );
  }
}
