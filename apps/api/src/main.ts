import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);

  // Security headers (section 27/28 baseline: CSP, HSTS, X-Content-Type-Options, ...).
  app.use(helmet());

  // Explicit origin allowlist — never "*" together with credentials (section 23).
  const allowedOrigins = config
    .get('CORS_ALLOWED_ORIGINS', { infer: true })
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new AllExceptionsFilter());

  if (config.get('SWAGGER_ENABLED', { infer: true })) {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Visionamos API')
        .setDescription('API de negocio del monorepo Visionamos (apps/api)')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    // cleanupOpenApiDoc normalizes the Zod-derived schema so the generated
    // OpenAPI document matches what nestjs-zod actually validates at runtime.
    SwaggerModule.setup('api/v1/docs', app, cleanupOpenApiDoc(document));
  }

  const port = config.get('PORT', { infer: true });
  await app.listen(port);
}

void bootstrap();
