import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, Logger } from '@nestjs/common';
import type { ProblemDetails } from '@repo/contracts';
import type { Request, Response } from 'express';
import { ZodValidationException } from 'nestjs-zod';
import { QueryFailedError } from 'typeorm';
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

/**
 * Nest's built-in exceptions (e.g. `new UnauthorizedException('Invalid
 * email or password.')`) don't return that string from `getResponse()` —
 * `HttpException.createBody` wraps any string/number/boolean argument into
 * `{ statusCode, message, error }`. Only a *plain object* passed directly as
 * the exception body bypasses that wrapping. So a custom message must be
 * read from `.message`, not assumed to be the whole response.
 */
/**
 * Postgres driver error codes: 23505 = unique_violation, 23503 =
 * foreign_key_violation. SQLite (better-sqlite3, used in tests —
 * docs/adr/010) reports the same two classes as `SQLITE_CONSTRAINT_UNIQUE`
 * and `SQLITE_CONSTRAINT_FOREIGNKEY`. Both engines see the same entity
 * decorators (docs/adr/011), so the same `QueryFailedError` shape reaches
 * here regardless of which one is running.
 */
const UNIQUE_VIOLATION_CODES = new Set(['23505', 'SQLITE_CONSTRAINT_UNIQUE']);
const FOREIGN_KEY_VIOLATION_CODES = new Set(['23503', 'SQLITE_CONSTRAINT_FOREIGNKEY']);

function driverErrorCode(driverError: Error): string | undefined {
  // `driverError` is typed as a plain `Error` (TypeORM's default generic
  // for QueryFailedError<T>) — the driver-specific `code` property isn't
  // part of that type, so this narrows deliberately rather than trusting
  // an `any`.
  return (driverError as { code?: string }).code;
}

function extractDetail(exception: HttpException): string | undefined {
  const response = exception.getResponse();
  if (typeof response === 'string') {
    return response;
  }
  if (typeof response === 'object' && response !== null && 'message' in response) {
    const { message } = response;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join('; ');
    }
  }
  return undefined;
}

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
      const detail = extractDetail(exception) ?? STATUS_TITLES[status];
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

    if (exception instanceof QueryFailedError) {
      // Bare `instanceof QueryFailedError` narrows the generic to `any`
      // (a TS quirk with `instanceof` against a generic class, not
      // TypeORM's own `= Error` default) — the explicit cast makes that
      // widening visible instead of letting `any` flow silently into
      // driverErrorCode.
      const code = driverErrorCode(exception.driverError as Error);
      // A UNIQUE/FK constraint (docs/adr/011 — CHECK/UNIQUE/FK are meant to
      // be enforced, not decorative) is a client-facing 409, not a leaked
      // 500: it means "this write conflicts with existing data", the same
      // class of error as the explicit ConflictExceptions already thrown
      // elsewhere (e.g. duplicate email/taxId) — just caught at the
      // database layer instead of a redundant pre-check in every service.
      if (UNIQUE_VIOLATION_CODES.has(code ?? '') || FOREIGN_KEY_VIOLATION_CODES.has(code ?? '')) {
        const problem: ProblemDetails = {
          type: 'about:blank',
          title: STATUS_TITLES[409]!,
          status: 409,
          detail: 'This request conflicts with existing data.',
          instance: request.url,
        };
        response.status(409).type('application/problem+json').json(problem);
        return;
      }
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
