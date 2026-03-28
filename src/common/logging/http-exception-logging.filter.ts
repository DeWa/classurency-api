import { ArgumentsHost, Catch, HttpException, HttpStatus } from '@nestjs/common';
import type { HttpServer } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';

const UNKNOWN_EXCEPTION_MESSAGE = 'Internal server error' as const;

/**
 * Logs every thrown exception with Pino, then delegates to Nest's default HTTP response handling.
 */
@Catch()
export class HttpExceptionLoggingFilter extends BaseExceptionFilter {
  public constructor(private readonly logger: PinoLogger) {
    super();
  }

  public catch(exception: unknown, host: ArgumentsHost): void {
    this.logException(exception, host);
    super.catch(exception, host);
  }

  /**
   * Mirrors {@link BaseExceptionFilter.handleUnknownError} without Nest's console logger
   * so errors are only recorded via Pino in {@link HttpExceptionLoggingFilter.catch}.
   */
  public handleUnknownError(
    exception: unknown,
    host: ArgumentsHost,
    applicationRef: AbstractHttpAdapter | HttpServer,
  ): void {
    const body = this.isHttpError(exception)
      ? {
          statusCode: exception.statusCode,
          message: exception.message,
        }
      : {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: UNKNOWN_EXCEPTION_MESSAGE,
        };
    const response: Response = host.switchToHttp().getResponse<Response>();
    if (!applicationRef.isHeadersSent(response)) {
      applicationRef.reply(response, body, body.statusCode);
    } else {
      applicationRef.end(response);
    }
  }

  private logException(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<{ method: string; url: string }>();
    const status: number =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const logPayload: Record<string, unknown> = {
      statusCode: status,
      path: request.url,
      method: request.method,
    };
    if (exception instanceof HttpException) {
      logPayload.response = exception.getResponse();
    }
    if (exception instanceof Error) {
      logPayload.err = exception;
    } else {
      logPayload.exception = exception;
    }
    this.logger.error(logPayload, 'exception thrown');
  }
}
