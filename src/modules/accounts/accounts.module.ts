import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/user.entity';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { CryptoModule } from '@common/crypto/crypto.module';
import { Account } from './account.entity';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountAttempt } from './account-attempt.entity';
import { TransactionsModule } from '@modules/transactions/transactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Account, AccountAttempt]),
    CryptoModule,
    ApiTokensModule,
    forwardRef(() => TransactionsModule),
  ],
  controllers: [AccountsController],
  providers: [AccountsService],
  exports: [AccountsService],
})
export class AccountsModule {}
