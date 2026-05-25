import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { VersioningType } from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  const appConfig = app.get(AppConfigService);

  // Must match `main.ts`: global prefix `api` + default URI version prefix `v` => `/api/v1/...`
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });

  const { swagger } = appConfig;
  const config = new DocumentBuilder()
    .setTitle(swagger.title)
    .setDescription(swagger.description)
    .setVersion(swagger.version)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'token' }, 'bearer')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const outputPath = resolve(process.cwd(), swagger.outputPath);

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf8');

  await app.close();
}

void generate();
