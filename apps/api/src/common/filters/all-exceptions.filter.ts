import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ProblemDetails } from '@repo/contracts';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { ZodError } from 'zod';

/**
 * Translates every exception into an RFC 9457 (application/problem+json)
 * response (docs/API_GUIDELINES.md). Nothing internal — stack traces, SQL,
 * file paths, secrets — ever reaches the client (section 16).
 */
const STATUS_TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  409: 'Conflict',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof ZodValidationException) {
      // nestjs-zod types getZodError() as `unknown` (it supports both Zod 3
      // and 4 peers); narrow it with a real runtime check rather than a cast.
      const zodError = exception.getZodError();
      const issues = zodError instanceof ZodError ? zodError.issues : [];
      const problem: ProblemDetails = {
        type: 'about:blank',
        title: STATUS_TITLES[400]!,
        status: 400,
        detail: 'La solicitud no cumple el esquema esperado.',
        instance: request.url,
        errors: issues.map((issue) => ({
          field: issue.path.join('.') || '(root)',
          message: issue.message,
        })),
      };
      response.status(400).type('application/problem+json').json(problem);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const nestResponse = exception.getResponse();
      const detail = typeof nestResponse === 'string' ? nestResponse : STATUS_TITLES[status];
      const problem: ProblemDetails = {
        type: 'about:blank',
        title: STATUS_TITLES[status] ?? exception.name,
        status,
        detail,
        instance: request.url,
      };
      response.status(status).type('application/problem+json').json(problem);
      return;
    }

    // Unrecognized error: log full detail server-side only, return a generic
    // 500 body — this is the boundary that prevents A10 (mishandling of
    // exceptional conditions) from turning into an information leak.
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    const problem: ProblemDetails = {
      type: 'about:blank',
      title: STATUS_TITLES[500]!,
      status: 500,
      instance: request.url,
    };
    response.status(500).type('application/problem+json').json(problem);
  }
}
