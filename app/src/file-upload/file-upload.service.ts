import { BadRequestException, Injectable } from '@nestjs/common';
import { MinioService } from '../minio/minio.service';
import { PredictionMarketService } from '../prediction-market/prediction-market.service';
import { UploadAndUpdateMarketOutcomeIconDto } from './dtos/upload-n-update-pm-outcome-icon.dto';
import { UploadAndUpdateOperationResultDto } from './dtos/responses/upload-n-update-result.dto';
import { UploadAndUpdatePredictionMarketImageDto } from './dtos/upload-n-update-prediction-market-image.dto';

@Injectable()
export class FileUploadService {
  constructor(
    private readonly minioService: MinioService,
    private readonly predictionMarketService: PredictionMarketService,
  ) {}

  async addPredictionMarketImageByFileBuffer(
    file: Express.Multer.File,
    directUpdateData?: UploadAndUpdatePredictionMarketImageDto,
  ): Promise<UploadAndUpdateOperationResultDto> {
    if (!file?.originalname?.length)
      throw new BadRequestException('No file uploaded.');
    const uploadedFile =
      await this.minioService.uploadPredictionMarketImage(file);
    if (!uploadedFile?.filename)
      throw new BadRequestException(
        'Something went wrong while uploading the market image!',
      );

    const { filename } = uploadedFile;
    if (!directUpdateData?.marketId) {
      return { filename };
    }
    try {
      await this.predictionMarketService[
        directUpdateData.reserved
          ? 'updateReservedPredictionMarketData'
          : 'updatePredictionMarketData'
      ](directUpdateData.marketId, { image: filename });
    } catch (ex) {
      return {
        filename,
        successfullyUpdated: false,
        extraExplanation: (ex as Error).message,
      };
    }
    return { filename, successfullyUpdated: true };
  }

  async addOutcomeIconByFileBuffer(
    file: Express.Multer.File,
    directUpdateData?: UploadAndUpdateMarketOutcomeIconDto,
  ): Promise<UploadAndUpdateOperationResultDto> {
    if (!file?.originalname?.length)
      throw new BadRequestException('No file uploaded.');
    const uploadedFile = await this.minioService.uploadOutcomeIcon(file);
    if (!uploadedFile?.filename)
      throw new BadRequestException(
        'Something went wrong while uploading the market outcome icon!',
      );

    const { filename } = uploadedFile;
    if (!directUpdateData?.outcomeId) {
      return { filename };
    }
    try {
      await this.predictionMarketService.updateOutcomeIcon(
        directUpdateData.outcomeId,
        uploadedFile.filename,
        { reserved: directUpdateData.reserved, shouldThrow: true },
      );
    } catch (ex) {
      return {
        filename,
        successfullyUpdated: false,
        extraExplanation: (ex as Error).message,
      };
    }
    return { filename, successfullyUpdated: true };
  }

  async addCategoryIconByFileBuffer(
    file: Express.Multer.File,
    categoryId?: number,
  ): Promise<UploadAndUpdateOperationResultDto> {
    if (!file?.originalname?.length)
      throw new BadRequestException('No file uploaded.');
    const uploadedFile = await this.minioService.uploadMarketCategoryIcon(file);
    if (!uploadedFile?.filename)
      throw new BadRequestException(
        'Something went wrong while uploading the market category icon!',
      );
    const { filename } = uploadedFile;
    if (!categoryId) {
      return { filename };
    }

    try {
      await this.predictionMarketService.updateCategoryData(categoryId, {
        icon: uploadedFile.filename,
      });
    } catch (ex) {
      return {
        filename,
        successfullyUpdated: false,
        extraExplanation: (ex as Error).message,
      };
    }

    return { filename, successfullyUpdated: true };
  }
}
