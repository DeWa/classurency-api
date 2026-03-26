import { join } from 'node:path';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '@modules/users/user.entity';
import { Transaction } from '@modules/transactions/transaction.entity';
import { Block } from '@common/blockchain/block.entity';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres',
    host: config.get<string>('DB_HOST', 'localhost'),
    port: Number(config.get<number>('DB_PORT', 5432)),
    username: config.get<string>('DB_USER', 'postgres'),
    password: config.get<string>('DB_PASSWORD', 'postgres'),
    /**
     * Prefer `process.env.DB_NAME` so tooling (e.g. Jest e2e `setupFiles`) that mutates
     * environment variables at runtime can target a specific DB, even if ConfigService
     * has already read configuration values earlier in the app lifecycle.
     */
    database: process.env.DB_NAME ?? config.get<string>('DB_NAME', 'classurency'),
    entities: [User, Transaction, Block],
    /**
     * Same migration paths as `ormconfig.ts` so `DataSource.runMigrations()` (e.g. e2e bootstrap) applies schema.
     * Without this, Nest's TypeORM has no migration files and tables such as `items` never exist.
     */
    migrations: [join(__dirname, '..', 'migrations', '*.ts'), join(__dirname, '..', 'migrations', '*.js')],
    synchronize: false,
    autoLoadEntities: true,
  }),
};
