import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { User } from '@modules/users/user.entity';
import { Account } from '@modules/accounts/account.entity';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { ItemProvider } from './item-provider.entity';
import { ItemProvidersService } from './item-providers.service';
import { ItemProvidersController } from './item-providers.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ItemProvider, User, Account]), CryptoModule, ApiTokensModule],
  controllers: [ItemProvidersController],
  providers: [ItemProvidersService],
  exports: [ItemProvidersService, TypeOrmModule],
})
export class ItemProvidersModule {}
