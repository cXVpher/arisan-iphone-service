import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message =
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null &&
      'message' in exceptionResponse
        ? (exceptionResponse as any).message
        : exception.message;

    const finalMessage = Array.isArray(message) ? message[0] : message;

    const logLevel = status >= HttpStatus.INTERNAL_SERVER_ERROR ? 'error' : 'warn';
    this.logger[logLevel](`${request.method} ${request.url} - ${status}: ${finalMessage}`, {
      context: 'HttpExceptionFilter',
      statusCode: status,
      userId: (request as any).user?.id || '-',
      ip: request.ip,
    });

    const apiResponse: ApiResponse = {
      status: false,
      code: status,
      message: finalMessage,
    };

    response.status(status).json(apiResponse);
  }
}
