import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

/**
 * Creates a Nest application configured like production (`main.ts`).
 * Runs pending migrations so the e2e DB schema matches `global-setup.ts` even if Jest globalSetup was skipped.
 */
export async function createConfiguredE2eApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app: INestApplication = moduleFixture.createNestApplication();
  app.setGlobalPrefix('api');
  app.enableVersioning({
    type: VersioningType.URI,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  const dataSource: DataSource = app.get(DataSource);
  await dataSource.runMigrations();
  return app;
}
