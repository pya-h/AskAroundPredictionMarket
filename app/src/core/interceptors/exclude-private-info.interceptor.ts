import { CallHandler, NestInterceptor, UseInterceptors } from '@nestjs/common';
import { map, Observable } from 'rxjs';
import { plainToClass } from 'class-transformer';

type ClassType<T> = new (...args: unknown[]) => T;

export class ExcludePrivateInfoInterceptor<T, U> implements NestInterceptor {
  constructor(
    private dataType: ClassType<T>,
    private expectedTemplate?: ClassType<U>,
    private parentFields?: string[],
  ) {}

  filterOutPrivateData(data: unknown) {
    if (data instanceof this.dataType) {
      return this.expectedTemplate
        ? plainToClass(this.expectedTemplate, data, {
            excludeExtraneousValues: true,
          })
        : plainToClass(this.dataType, data, {
            excludeExtraneousValues: true,
          });
    }
    return data;
  }

  processEachInstance(data: unknown) {
    if (!this.parentFields?.length) {
      return this.filterOutPrivateData(data);
    }
    const field = this.parentFields[this.parentFields.length - 1];
    let toBeFilteredDataParent = data;
    for (let i = 0; i < this.parentFields.length - 1; i++) {
      if (!toBeFilteredDataParent?.[this.parentFields[i]]) break;
      toBeFilteredDataParent = toBeFilteredDataParent[this.parentFields[i]];
    }

    if (!toBeFilteredDataParent?.[field]) {
      // In case the inner field holding private info was an optional field, and was null/undefined, cancel filter out process.
      return data;
    }
    toBeFilteredDataParent[field] = this.filterOutPrivateData(
      toBeFilteredDataParent[field],
    );
    return data;
  }

  intercept(
    _: never,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof Array) {
          return data.map((item) => this.processEachInstance(item));
        }
        return this.processEachInstance(data);
      }),
    );
  }
}

/**
 *
 * @param expectedTemplate if specified, data will be mapped to it, otherwise it will be mapped to class itself (in case exposing items are specified in class definition)
 * @param parentFields if the data to be filtered is inside the returning response - not the response itself-
 *    the object keys hierarchy (leading to target data) must be specified.
 */
export function ExcludePrivateInfo<T, U>(
  dataType: ClassType<T>,
  expectedTemplate?: ClassType<U>,
  parentFields?: string[],
) {
  return UseInterceptors(
    new ExcludePrivateInfoInterceptor(dataType, expectedTemplate, parentFields),
  );
}
