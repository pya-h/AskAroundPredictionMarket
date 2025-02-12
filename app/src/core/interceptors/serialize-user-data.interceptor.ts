import {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
  UseInterceptors,
} from '@nestjs/common';
import { plainToClass } from 'class-transformer';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PublicUserData } from '../../user/dto/public-user-data.dto';
import { User } from '../../user/entities/user.entity';

export class SerializePublicUserDataInterceptor implements NestInterceptor {
  constructor(private customTargets: string[] | null = null) {
    this.customTargets = customTargets;
  }

  collectProperData(userData: unknown, currentUser?: User) {
    if (userData && typeof userData === 'object') {
      try {
        if (!userData['username']) return userData;
        if (
          userData['id'] === currentUser?.id ||
          userData['accessToken'] ||
          currentUser?.admin
        ) {
          delete userData['password'];
          return userData;
        }
      } catch (ex) {}
    }

    return plainToClass(PublicUserData, userData, {
      excludeExtraneousValues: true,
    });
  }

  mapData(data: unknown, currentUser: User) {
    if (Array.isArray(data)) {
      return data.map((item) => this.collectProperData(item, currentUser));
    }

    return this.collectProperData(data, currentUser);
  }

  mapSubFields(data: unknown, currentUser: User) {
    for (const key of this.customTargets) {
      if (data[key]) data[key] = this.mapData(data[key], currentUser);
    }
    return data;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<unknown> | Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((data: unknown) => {
        if (this.customTargets?.length) {
          if (Array.isArray(data)) {
            return data.map((item) => this.mapSubFields(item, req.user));
          }
          return this.mapSubFields(data, req.user);
        }

        return this.mapData(data, req.user);
      }),
    );
  }
}

export function NoPersonalUserDataInterceptor(...customTargets: string[]) {
  return UseInterceptors(
    customTargets?.length
      ? new SerializePublicUserDataInterceptor(customTargets)
      : SerializePublicUserDataInterceptor,
  );
}
