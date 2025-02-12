import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class ValidateNonNegativeParamInterceptor implements NestInterceptor {
  protected paramFullName: string;

  constructor(
    protected entityName: string = 'entity',
    protected paramKey: string = 'id',
  ) {
    this.paramFullName =
      this.entityName !== this.paramKey
        ? `${this.entityName} ${this.paramKey}`
        : this.paramKey; // This is for endpoints like /level/rank/:rank where it doesnt mean to say sth like 'rank rank'
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const { params } = context.switchToHttp().getRequest();

    if (!params || !params[this.paramKey])
      throw new BadRequestException(
        `You must provide the ${this.paramFullName}}.`,
      );

    const param = +params[this.paramKey];
    if (isNaN(param) || (param | 0) !== param || param < 0)
      throw new BadRequestException(
        `${this.paramFullName} must be a non-negative integer number.`,
      );

    return next.handle();
  }
}

export function ValidateNonNegativeParam(
  entityName: string,
  paramKey: string = 'id',
) {
  return UseInterceptors(
    new ValidateNonNegativeParamInterceptor(entityName, paramKey),
  );
}

// this one is just shortcut to distinguish id validation from other parameter validation
export const ValidateIdParam = ValidateNonNegativeParam;
