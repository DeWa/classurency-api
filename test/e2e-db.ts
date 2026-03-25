import { DataSource } from 'typeorm';

/**
 * Clears all application data tables (PostgreSQL). Used between isolated e2e cases.
 */
export async function truncateAllE2eTables(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    TRUNCATE TABLE
      items,
      transactions,
      account_attempts,
      api_tokens,
      item_providers,
      accounts,
      blocks,
      users
    RESTART IDENTITY CASCADE;
  `);
}
