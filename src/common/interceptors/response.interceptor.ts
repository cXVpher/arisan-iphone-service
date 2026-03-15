import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        const statusCode = response.statusCode;
        const isSuccess = statusCode >= 200 && statusCode < 300;

        const apiResponse: ApiResponse = {
          status: isSuccess,
          code: statusCode,
          message: this.getMessageByStatusCode(statusCode),
          data: data || undefined,
        };

        // Jika data null/undefined, jangan include field data
        if (!data) {
          delete apiResponse.data;
        }

        return apiResponse;
      }),
    );
  }

  private getMessageByStatusCode(statusCode: number): string {
    const messages: { [key: number]: string } = {
      [HttpStatus.OK]: 'Success',
      [HttpStatus.CREATED]: 'Created successfully',
      [HttpStatus.ACCEPTED]: 'Accepted',
      [HttpStatus.NO_CONTENT]: 'No content',
      [HttpStatus.MOVED_PERMANENTLY]: 'Moved permanently',
      [HttpStatus.FOUND]: 'Found',
      [HttpStatus.NOT_MODIFIED]: 'Not modified',
      [HttpStatus.BAD_REQUEST]: 'Bad request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal server error',
      [HttpStatus.NOT_IMPLEMENTED]: 'Not implemented',
      [HttpStatus.BAD_GATEWAY]: 'Bad gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service unavailable',
    };

    return messages[statusCode] || 'Unknown';
  }
}
