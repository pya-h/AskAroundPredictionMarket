import { ExecutionContext, createParamDecorator } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: never, ctx: ExecutionContext) => {
    // This decorator must come after CurrentUserInterceptor
    // o.w. it fails.
    const request = ctx.switchToHttp().getRequest();
    return request.currentUser;
  },
);
