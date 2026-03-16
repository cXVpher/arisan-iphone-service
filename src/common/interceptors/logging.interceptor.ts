import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, body, headers } = request;
    const userAgent = headers['user-agent'] || '-';
    const ip = request.ip || request.socket.remoteAddress || '-';
    const startTime = Date.now();

    const userId = (request as any).user?.id || '-';

    this.logger.info(`--> ${method} ${url}`, {
      context: 'HTTP',
      userId,
      ip,
      userAgent,
      body: method !== 'GET' ? this.sanitizeBody(body) : undefined,
    });

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.info(`<-- ${method} ${url} ${response.statusCode} ${duration}ms`, {
            context: 'HTTP',
            userId,
            statusCode: response.statusCode,
            duration,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`<-- ${method} ${url} ${error.status || 500} ${duration}ms`, {
            context: 'HTTP',
            userId,
            statusCode: error.status || 500,
            duration,
            error: error.message,
          });
        },
      }),
    );
  }

  private sanitizeBody(body: Record<string, any>): Record<string, any> {
    if (!body) return body;
    const sensitiveFields = ['password', 'token', 'secret', 'pin'];
    const sanitized = { ...body };
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '***';
      }
    }
    return sanitized;
  }
}
