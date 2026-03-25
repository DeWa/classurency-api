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
    database: config.get<string>('DB_NAME', 'classurency'),
    entities: [User, Transaction, Block],
    synchronize: false,
    autoLoadEntities: true,
  }),
};
