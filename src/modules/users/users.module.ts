import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { ItemProvidersModule } from '@modules/item-providers/item-providers.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CryptoModule, ApiTokensModule, ItemProvidersModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
