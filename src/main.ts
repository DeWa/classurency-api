import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // `/api` is the global prefix; URI versioning uses the default `v` segment, so paths are `/api/v1/...`.
  // Do not set `prefix: 'api'` on versioning — Nest concatenates prefix + version with no slash, which yields `/api1`.
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const swaggerEnabled =
    (process.env.SWAGGER_ENABLED ?? '') !== 'false' && (process.env.NODE_ENV ?? '') !== 'production';
  if (swaggerEnabled) {
    const swaggerPath = process.env.SWAGGER_PATH ?? 'docs';

    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE ?? 'Classurency API')
      .setDescription(process.env.SWAGGER_DESCRIPTION ?? 'API documentation for the Classurency backend.')
      .setVersion(process.env.SWAGGER_VERSION ?? '0.0.1')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'token' }, 'bearer')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swaggerPath, app, document);

    const shouldWriteSpec = (process.env.SWAGGER_WRITE_ON_BOOT ?? 'true') !== 'false';
    if (shouldWriteSpec) {
      const outputPath = resolve(process.cwd(), process.env.SWAGGER_OUTPUT_PATH ?? 'docs/openapi.json');
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf8');
    }
  }

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
