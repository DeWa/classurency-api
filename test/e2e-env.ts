/**
 * Loaded before each e2e test file so Nest and TypeORM use the same defaults as `test/global-setup.ts`.
 *
 * Always set `DB_NAME` for this Jest process. Do not inherit `DB_NAME` from `.env` / shell: otherwise
 * tests would hit the wrong database while `global-setup.ts` migrates `classurency_e2e`, and TRUNCATE
 * would fail with "relation \"items\" does not exist" if that database was never migrated.
 */
process.env.CLASSURENCY_MASTER_KEY = process.env.CLASSURENCY_MASTER_KEY ?? Buffer.alloc(32, 7).toString('base64');
process.env.CLASSURENCY_CARD_EXPORT_KEY =
  process.env.CLASSURENCY_CARD_EXPORT_KEY ?? Buffer.alloc(32, 8).toString('base64');
process.env.DB_NAME = process.env.E2E_DB_NAME ?? 'classurency_e2e';
