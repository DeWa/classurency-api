import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemProvider } from '@modules/item-providers/item-provider.entity';
import { ItemsService } from './items.service';
import { Item } from './item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, ItemProvider])],
  providers: [ItemsService],
  exports: [ItemsService, TypeOrmModule],
})
export class ItemsModule {}
