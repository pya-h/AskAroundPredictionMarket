import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { map, Observable } from 'rxjs';
import {
  StandardResponse,
  StandardResponseStatusEnum,
} from '../classes/standard-response';

// This interceptor transforms all the responses from route handlers and wraps
// them into the standard response object.
@Injectable()
export class StandardResponseTransformInterceptor<T>
  implements NestInterceptor<T, StandardResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<StandardResponse<T>> {
    if (context.switchToHttp().getRequest().url === '/metrics') {
      return next.handle() as Observable<StandardResponse<T>>;
    }

    return next.handle().pipe(
      map((data) => {
        const response = new StandardResponse<T>(
          StandardResponseStatusEnum.SUCCESS,
        );

        // If any data is returned from the handlers
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof data.message === 'string'
        ) {
          // To return a message from the handled (response.message property), put
          // a message property on the object that is returned by the route handler
          response.message = data.message;
          delete data.message;
        }

        response.data = data;

        return response;
      }),
    );
  }
}
