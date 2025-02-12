import {
  Body,
  Controller,
  MaxFileSizeValidator,
  ParseFilePipe,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Express } from 'express';
import { FileMultiTypeValidator } from '../core/validators/file-multi-type.validator';
import { FileUploadService } from './file-upload.service';
import { ApiStandardOkResponse } from '../core/decorators/api-standard-ok-response.decorator';
import { UploadAndUpdateMarketCategoryIconDto } from './dtos/upload-n-update-pm-category-icon.dto';
import { FileUploadEndpoint } from './decorators/file-upload-endpoint.decorator';
import { UploadAndUpdateMarketOutcomeIconDto } from './dtos/upload-n-update-pm-outcome-icon.dto';
import { UploadAndUpdateOperationResultDto } from './dtos/responses/upload-n-update-result.dto';
import { UploadAndUpdatePredictionMarketImageDto } from './dtos/upload-n-update-prediction-market-image.dto';
import { AuthGuard } from '../user/guards/auth.guard';

const FILE_VALIDATORS = [
  new MaxFileSizeValidator({
    maxSize: 20000000,
  }),

  new FileMultiTypeValidator({
    fileTypes: ['image/jpeg', 'image/jpg', 'image/png'],
  }),
];

@ApiTags('File Upload')
@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @UseGuards(AuthGuard)
  @ApiStandardOkResponse(UploadAndUpdateOperationResultDto)
  @ApiBearerAuth()
  @FileUploadEndpoint('prediction-market', 'Prediction Market Image')
  uploadPredictionMarketImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: FILE_VALIDATORS,
      }),
    )
    file: Express.Multer.File,
    @Body() directUpdateData?: UploadAndUpdatePredictionMarketImageDto,
  ) {
    return this.fileUploadService.addPredictionMarketImageByFileBuffer(
      file,
      directUpdateData,
    );
  }

  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiStandardOkResponse(UploadAndUpdateOperationResultDto)
  @FileUploadEndpoint('pm-outcome', 'Prediction Market Outcome Icon')
  uploadOutcomeIcon(
    @UploadedFile(
      new ParseFilePipe({
        validators: FILE_VALIDATORS,
      }),
    )
    file: Express.Multer.File,
    @Body() directUpdateData?: UploadAndUpdateMarketOutcomeIconDto,
  ) {
    return this.fileUploadService.addOutcomeIconByFileBuffer(
      file,
      directUpdateData,
    );
  }

  @UseGuards(AuthGuard)
  @ApiStandardOkResponse(UploadAndUpdateOperationResultDto)
  @ApiBearerAuth()
  @FileUploadEndpoint('pm-category', 'Prediction Market Category Icon')
  uploadCategoryIcon(
    @UploadedFile(
      new ParseFilePipe({
        validators: FILE_VALIDATORS,
      }),
    )
    file: Express.Multer.File,
    @Body() { categoryId = null }: UploadAndUpdateMarketCategoryIconDto,
  ) {
    return this.fileUploadService.addCategoryIconByFileBuffer(file, categoryId);
  }
}
