import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { ItemProvider } from '@modules/item-providers/item-provider.entity';
import { ItemProvidersModule } from '@modules/item-providers/item-providers.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { ItemsService } from './items.service';
import { ItemsController } from './items.controller';
import { Item } from './item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemProvider]), CryptoModule, ItemProvidersModule, ApiTokensModule],
  controllers: [ItemsController],
  providers: [ItemsService],
  exports: [ItemsService, TypeOrmModule],
})
export class ItemsModule {}
