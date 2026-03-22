import { Module } from '@nestjs/common';
import { TransactionsModule } from '@modules/transactions/transactions.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TransactionsModule, ApiTokensModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
