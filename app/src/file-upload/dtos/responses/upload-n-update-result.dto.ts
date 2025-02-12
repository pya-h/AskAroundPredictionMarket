import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UploadAndUpdateOperationResultDto {
  @ApiProperty({
    type: 'string',
    description:
      'Unique Filename of the uploaded file in minio; You can then pass this filename as icon/image field value.',
    example: '1738189264632.c3ce9661-b10f-4127-bc39-cb4e5e202a51.jpeg',
  })
  filename: string;

  @ApiPropertyOptional({
    type: 'boolean',
    description: `Only set while direct updating target entity (outcome/market/etc); It doesn't specify the upload result, only the update process.
      Upload failure is specified with throwing errors. e.g. File is successfully uploaded, but the update operation has failed due to not founding the entity specified by id.`,
    required: false,
  })
  successfullyUpdated?: boolean;

  @ApiPropertyOptional({
    type: 'string',
    description: `Only is set when file uploads successfully but direct upload process is failed; This field will specify the failure reason.
        The reason for such architecture is to prevent multiple uploads of the same file only because the update process has failed;
        In such cases, front should take filename and use that entity update endpoints manually with corrected data.`,
    required: false,
  })
  extraExplanation?: string;
}
