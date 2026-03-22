import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CryptoService } from '@common/crypto/crypto.service';
import { User } from '@modules/users/user.entity';
import { LoginDto } from './dto/login.dto';
import { mapUserToApiTokenPrivilege } from '@common/mappers';
import { ApiTokensService } from '@modules/api-tokens/api-tokens.service';
import { LoginResponseDto } from './dto/login.dto';
import { ApiTokenType } from '@modules/api-tokens/api-token.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
    private readonly apiTokensService: ApiTokensService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersRepo.findOne({ where: { userName: dto.userName } });
    if (!user) {
      throw new UnauthorizedException('User not found or invalid password');
    }
    const passwordOk = await this.cryptoService.verifyPassword(user.passwordHash, dto.password);
    if (!passwordOk) {
      throw new UnauthorizedException('User not found or invalid password');
    }
    const privilege = mapUserToApiTokenPrivilege(user.type);
    const token = await this.apiTokensService.createToken(user, privilege, ApiTokenType.LOGIN);
    return {
      token: token.tokenHash,
      privilege,
      expiresAt: token.expiresAt,
      userId: user.id,
      type: token.type,
    };
  }
}
