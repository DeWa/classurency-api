import { join } from 'node:path';
import { TypeOrmModuleAsyncOptions } from '@nestjs/typeorm';
import { User } from '@modules/users/user.entity';
import { Transaction } from '@modules/transactions/transaction.entity';
import { Block } from '@common/blockchain/block.entity';
import { AppConfigModule } from './app-config.module';
import { AppConfigService } from './app-config.service';

export const typeOrmConfig: TypeOrmModuleAsyncOptions = {
  imports: [AppConfigModule],
  inject: [AppConfigService],
  useFactory: (appConfig: AppConfigService) => ({
    type: 'postgres' as const,
    host: appConfig.database.host,
    port: appConfig.database.port,
    username: appConfig.database.username,
    password: appConfig.database.password,
    database: appConfig.database.database,
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
