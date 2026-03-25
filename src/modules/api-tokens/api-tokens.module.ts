import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { User } from '@modules/users/user.entity';
import { ApiTokensController } from './api-tokens.controller';
import { ApiTokensService } from './api-tokens.service';
import { ApiToken } from './api-token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApiToken, User]), CryptoModule],
  controllers: [ApiTokensController],
  providers: [ApiTokensService],
  exports: [ApiTokensService],
})
export class ApiTokensModule {}
