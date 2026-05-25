/* eslint-disable */
import './path-alias-register';
import { Client } from 'pg';
import { createAppDataSource } from '../ormconfig';
import { resetAppConfigCache } from '../src/config/app.config';

const defaultMasterKey: string = Buffer.alloc(32, 7).toString('base64');
const defaultCardKey: string = Buffer.alloc(32, 8).toString('base64');

/**
 * Ensures crypto env and e2e database exist, then runs migrations once per Jest run.
 * Env defaults must match `test/e2e-env.ts` (tests run in a different process).
 */
export default async function globalSetup(): Promise<void> {
  process.env.CLASSURENCY_MASTER_KEY = process.env.CLASSURENCY_MASTER_KEY ?? defaultMasterKey;
  process.env.CLASSURENCY_CARD_EXPORT_KEY = process.env.CLASSURENCY_CARD_EXPORT_KEY ?? defaultCardKey;
  const dbName: string = process.env.E2E_DB_NAME ?? 'classurency_e2e';
  process.env.DB_NAME = dbName;
  const host: string = process.env.DB_HOST ?? 'localhost';
  const port: number = Number(process.env.DB_PORT ?? 5432);
  const user: string = process.env.DB_USER ?? 'postgres';
  const password: string = process.env.DB_PASSWORD ?? 'postgres';
  resetAppConfigCache();
  const appDataSource = createAppDataSource();
  const adminClient: Client = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
  });
  await adminClient.connect();
  const existing = await adminClient.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"`,
    [dbName],
  );
  if (!existing.rows[0]?.exists) {
    await adminClient.query(`CREATE DATABASE "${dbName.replace(/"/g, '""')}"`);
  }
  await adminClient.end();
  if (appDataSource.isInitialized) {
    await appDataSource.destroy();
  }
  await appDataSource.initialize();
  await appDataSource.runMigrations();
  await appDataSource.destroy();
}
