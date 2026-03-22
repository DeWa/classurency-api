import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '@modules/users/user.entity';
import { ItemProvider } from './item-provider.entity';
import { ItemProvidersService } from './item-providers.service';

@Module({
  imports: [TypeOrmModule.forFeature([ItemProvider, User])],
  providers: [ItemProvidersService],
  exports: [ItemProvidersService, TypeOrmModule],
})
export class ItemProvidersModule {}
