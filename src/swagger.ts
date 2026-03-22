import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });

  // Must match `main.ts`: global prefix `api` + default URI version prefix `v` => `/api/v1/...`
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const config = new DocumentBuilder()
    .setTitle(process.env.SWAGGER_TITLE ?? 'Classurency API')
    .setDescription(process.env.SWAGGER_DESCRIPTION ?? 'API documentation for the Classurency backend.')
    .setVersion(process.env.SWAGGER_VERSION ?? '0.0.1')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'token' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(process.cwd(), process.env.SWAGGER_OUTPUT_PATH ?? 'docs/openapi.json');

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf8');

  await app.close();
}

void generate();
