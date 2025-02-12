import { StandardResponseTransformInterceptor } from './standard-response-transform.interceptor';

describe('ResponseTransformInterceptor', () => {
  it('should be defined', () => {
    expect(new StandardResponseTransformInterceptor()).toBeDefined();
  });
});
