import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Post } from '@nestjs/common';

export function FileUploadEndpoint(route: string, fileType: string) {
  return applyDecorators(
    ApiOperation({ description: `Upload ${fileType}.` }),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
    UseInterceptors(FileInterceptor('file')),
    Post(route),
  );
}
