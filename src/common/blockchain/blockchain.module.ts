import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Block } from './block.entity';
import { BlockchainService } from './blockchain.service';

@Module({
  imports: [TypeOrmModule.forFeature([Block])],
  providers: [BlockchainService],
  exports: [BlockchainService],
})
export class BlockchainModule {}
