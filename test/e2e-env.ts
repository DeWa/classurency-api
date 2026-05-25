import { resetAppConfigCache } from '../src/config/app.config';
import * as crypto from 'crypto';

/**
 * Loaded before each e2e test file so Nest and TypeORM use the same defaults as `test/global-setup.ts`.
 *
 * Always set `DB_NAME` for this Jest process. Do not inherit `DB_NAME` from `.env` / shell: otherwise
 * tests would hit the wrong database while `global-setup.ts` migrates `classurency_e2e`, and TRUNCATE
 * would fail with "relation \"items\" does not exist" if that database was never migrated.
 */
process.env.CLASSURENCY_MASTER_KEY = process.env.CLASSURENCY_MASTER_KEY ?? crypto.randomBytes(32).toString('base64');
process.env.CLASSURENCY_CARD_EXPORT_KEY =
  process.env.CLASSURENCY_CARD_EXPORT_KEY ?? crypto.randomBytes(32).toString('base64');
process.env.DB_NAME = process.env.E2E_DB_NAME ?? 'classurency_e2e';
process.env.DB_HOST = process.env.E2E_DB_HOST ?? 'localhost';
process.env.DB_PORT = process.env.E2E_DB_PORT ?? '5432';
process.env.DB_USER = process.env.E2E_DB_USER ?? 'postgres';
process.env.DB_PASSWORD = process.env.E2E_DB_PASSWORD ?? 'postgres';
resetAppConfigCache();
