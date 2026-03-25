import { Module } from '@nestjs/common';
import { CryptoModule } from '@common/crypto/crypto.module';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [CryptoModule, TransactionsModule, ApiTokensModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
