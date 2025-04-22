import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  constructor() {
    super({
      session: true,
    });
  }

  canActivate(
    context: ExecutionContext,
  ): Promise<boolean> | boolean | Observable<boolean> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest();
    const response = httpContext.getResponse();

    try {
      if (!response.setHeader) {
        response.setHeader = function (name: string, value: string) {
          this.raw.setHeader(name, value);
          return this;
        };

        response.end = function (data: any) {
          this.send(data || '');
          return this;
        };

        const originalRedirect = response.redirect;
        response.redirect = function (
          statusOrUrl: number | string,
          url?: string,
        ) {
          if (typeof statusOrUrl === 'string') {
            return originalRedirect.call(this, 302, statusOrUrl);
          } else if (typeof statusOrUrl === 'number' && url) {
            return originalRedirect.call(this, statusOrUrl, url);
          } else {
            return originalRedirect.call(this, 302, '/');
          }
        };
      }

      return super.canActivate(context);
    } catch (error) {
      if (error.code === 'invalid_grant') {
        response.redirect('/auth/google');
        return false;
      }

      throw error;
    }
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    return super.handleRequest(err, user, info, context);
  }
}
