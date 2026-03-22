import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from '@modules/accounts/account.entity';
import { CryptoModule } from '@common/crypto/crypto.module';
import { BlockchainModule } from '@common/blockchain/blockchain.module';
import { Item } from '@modules/items/item.entity';
import { ItemProvider } from '@modules/item-providers/item-provider.entity';
import { AccountsModule } from '@modules/accounts/accounts.module';
import { ItemsModule } from '@modules/items/items.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { Transaction } from './transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, Account, Item, ItemProvider]),
    AccountsModule,
    CryptoModule,
    BlockchainModule,
    ItemsModule,
    ApiTokensModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
