import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const appConfig = app.get(AppConfigService);
  app.useLogger(app.get(Logger));
  app.get(Logger).log('info', 'Starting server');
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

  const { swagger, port } = appConfig;
  if (swagger.enabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(swagger.title)
      .setDescription(swagger.description)
      .setVersion(swagger.version)
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'token' }, 'bearer')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(swagger.path, app, document);

    if (swagger.writeOnBoot) {
      const outputPath = resolve(process.cwd(), swagger.outputPath);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, JSON.stringify(document, null, 2), 'utf8');
    }
  }

  await app.listen(port);
  app.get(Logger).log('info', `Server started on port ${port}`);
}
void bootstrap();
