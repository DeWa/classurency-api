import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CryptoModule } from '@common/crypto/crypto.module';
import { ApiTokensModule } from '@modules/api-tokens/api-tokens.module';
import { User } from '@modules/users/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User]), CryptoModule, ApiTokensModule],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}
