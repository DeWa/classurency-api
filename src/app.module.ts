import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { HttpExceptionLoggingFilter } from '@common/logging/http-exception-logging.filter';
import { createPinoLoggerParams } from './config/pino-logger.config';
import { CryptoModule } from '@common/crypto/crypto.module';
import { BlockchainModule } from '@common/blockchain/blockchain.module';
import { UsersModule } from '@modules/users/users.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { AdminModule } from '@modules/admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from '@modules/auth/auth.module';
import { ItemProvidersModule } from '@modules/item-providers/item-providers.module';
import { ItemsModule } from '@modules/items/items.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(createPinoLoggerParams()),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    CryptoModule,
    BlockchainModule,
    UsersModule,
    TransactionsModule,
    AdminModule,
    AuthModule,
    ItemProvidersModule,
    ItemsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionLoggingFilter,
    },
  ],
})
export class AppModule {}
