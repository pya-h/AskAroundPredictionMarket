import { Test, TestingModule } from '@nestjs/testing';
import { FileUploadService } from './file-upload.service';
import { MinioService } from '../minio/minio.service';
import { AvatarService } from '../avatar/avatar.service';
import { NftService } from '../nft/nft.service';
import { PredictionMarketService } from '../prediction-market/prediction-market.service';

describe('FileUploadService', () => {
  let service: FileUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: MinioService, useValue: {} },
        { provide: AvatarService, useValue: {} },
        { provide: NftService, useValue: {} },
        { provide: PredictionMarketService, useValue: {} },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
