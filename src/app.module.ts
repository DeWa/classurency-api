import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { BlockchainModule } from '@common/blockchain/blockchain.module';
import { UsersModule } from '@modules/users/users.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { AdminModule } from '@modules/admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(typeOrmConfig),
    CryptoModule,
    BlockchainModule,
    UsersModule,
    TransactionsModule,
    AdminModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
