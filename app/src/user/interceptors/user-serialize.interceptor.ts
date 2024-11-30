import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from 'src/user/entities/user.entity';

interface DtoTypeAnnotation {
  // this is used for type annotaion dtoPrototype in UserSerializerInterceptor
  new (...args: any[]): object;
}
export function NoCredentialsUserSerialize(dtoProtoType: DtoTypeAnnotation) {
  return UseInterceptors(new UserSerializerInterceptor(dtoProtoType, User));
}

export class UserSerializerInterceptor implements NestInterceptor {
  constructor(
    private dtoProtoType: DtoTypeAnnotation,
    private typeToFileter: DtoTypeAnnotation,
  ) {}

  intercept(
    _: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> | Promise<Observable<any>> {
    return next.handle().pipe(
      map((data: any) => {
        if (!(data instanceof this.typeToFileter)) return data;
        return plainToClass(this.dtoProtoType, data, {
          // convert data(response) to the fornat
          excludeExtraneousValues: true,
        });
      }),
    );
  }
}
