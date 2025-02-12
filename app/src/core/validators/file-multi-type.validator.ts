import { FileValidator } from '@nestjs/common';
import { IFile } from '@nestjs/common/pipes/file/interfaces';

export type FileMultiTypeValidatorOptions = {
  fileTypes: string[];
};

export class FileMultiTypeValidator extends FileValidator<FileMultiTypeValidatorOptions> {
  buildErrorMessage(): string {
    return `Validation failed (expected type to be one of ${this.validationOptions.fileTypes.join(
      ', ',
    )})`;
  }

  isValid(file: IFile): boolean {
    if (!this.validationOptions) {
      return true;
    }

    if (!file || !file.mimetype) {
      return false;
    }

    return this.validationOptions.fileTypes.includes(file.mimetype as string);
  }
}
