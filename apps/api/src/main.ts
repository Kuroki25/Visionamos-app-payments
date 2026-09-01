import 'reflect-metadata';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';

import { AppModule } from './app.module';
import { configureApp } from './config/configure-app';
import type { Env } from './config/env.schema';

async function bootstrap(): Promise<void> {
  // bodyParser: false — configureApp() mounts Better Auth's own HTTP
  // handler, which needs to read the raw request body itself, before
  // Nest's automatic parser would otherwise consume it first (see
  // configureApp's docblock).
  const app = await NestFactory.create(AppModule, { bufferLogs: true, bodyParser: false });
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService<Env, true>);

  configureApp(app, config);

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
