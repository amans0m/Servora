import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Consistent, leak-free error envelope (§A6):
 *   { statusCode, error, message, correlationId, timestamp }
 *
 * - 4xx: the (safe) client message is returned — validation errors etc.
 * - 5xx: a GENERIC message only; the real error + stack go to server logs,
 *   correlated by id. No stack traces or internal detail ever reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const correlationId =
      (request.id as string | undefined) ??
      (response.getHeader('x-correlation-id') as string | undefined);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'Internal server error';
    let error = 'InternalServerError';

    if (status >= 500) {
      // Log full detail server-side only; never echo to the client.
      this.logger.error(
        { correlationId, path: request.url, method: request.method },
        exception instanceof Error ? exception.stack : String(exception),
      );
      // message/error stay generic.
    } else if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const body = res as Record<string, unknown>;
        message = (body.message as string | string[]) ?? exception.message;
        error = (body.error as string) ?? exception.name;
      }
    }

    response.status(status).json({
      statusCode: status,
      error,
      message,
      correlationId,
      timestamp: new Date().toISOString(),
    });
  }
}
