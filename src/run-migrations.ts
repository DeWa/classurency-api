import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';
import { getAppConfig } from './config/app.config';

/**
 * Runs pending TypeORM migrations against the configured database.
 * Intended for production startup (`npm run start:prod`) after `npm run build`.
 */
async function runMigrations(): Promise<void> {
  const { database } = getAppConfig();
  const dataSource = new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    migrations: [join(__dirname, 'migrations', '*.js')],
    synchronize: false,
    logging: true,
  });
  await dataSource.initialize();
  try {
    await dataSource.runMigrations();
  } finally {
    await dataSource.destroy();
  }
}

runMigrations().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
