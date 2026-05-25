import { DataSource } from 'typeorm';
import 'reflect-metadata';
import * as path from 'node:path';
import 'dotenv/config';
import { getAppConfig } from './src/config/app.config';

/**
 * TypeORM CLI and e2e bootstrap data source using validated application configuration.
 */
export function createAppDataSource(): DataSource {
  const { database } = getAppConfig();
  return new DataSource({
    type: 'postgres',
    host: database.host,
    port: database.port,
    username: database.username,
    password: database.password,
    database: database.database,
    entities: [path.join(__dirname, 'src/**/*.entity.ts'), path.join(__dirname, 'dist/**/*.entity.js')],
    migrations: [path.join(__dirname, 'src/migrations/*.ts'), path.join(__dirname, 'dist/migrations/*.js')],
    synchronize: false,
    logging: true,
  });
}

export const AppDataSource = createAppDataSource();
