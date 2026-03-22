import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '@modules/users/user.entity';
import { CryptoService } from '@common/crypto/crypto.service';
import { ApiToken, type ApiTokenPrivilege } from './api-token.entity';
import { RequestTokenDto } from './dto/request-token.dto';

const PRIVILEGE_RANK: Record<ApiTokenPrivilege, number> = {
  user: 1,
  provider: 2,
  admin: 3,
};

@Injectable()
export class ApiTokensService {
  constructor(
    @InjectRepository(ApiToken)
    private readonly apiTokensRepo: Repository<ApiToken>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    private readonly cryptoService: CryptoService,
  ) {}

  private ensureAllowedPrivilege(userType: UserType, privilege: ApiTokenPrivilege): ApiTokenPrivilege {
    let maxPrivilege: ApiTokenPrivilege;
    if (userType === UserType.ADMIN) {
      maxPrivilege = 'admin';
    } else if (userType === UserType.PROVIDER) {
      maxPrivilege = 'provider';
    } else {
      maxPrivilege = 'user';
    }

    if (PRIVILEGE_RANK[privilege] > PRIVILEGE_RANK[maxPrivilege]) {
      throw new UnauthorizedException('Insufficient privileges');
    }
    return maxPrivilege;
  }

  async issueToken(dto: RequestTokenDto, reqAuthId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id !== reqAuthId) {
      throw new UnauthorizedException('Invalid user');
    }

    this.ensureAllowedPrivilege(user.type, dto.privilege ?? 'user');

    const privilege = dto.privilege ?? 'user';

    const jwtToken = this.cryptoService.generateJwtToken(
      {
        userId: user.id,
        userType: user.type,
        tokenId: crypto.randomUUID(),
        privilege,
      },
      '180d',
    );

    const token = this.apiTokensRepo.create({
      userId: user.id,
      privilege,
      tokenHash: jwtToken,
      expiresAt: null,
      revokedAt: null,
    });
    await this.apiTokensRepo.save(token);

    return {
      token: jwtToken,
      privilege: token.privilege,
      userId: user.id,
    };
  }

  async validateToken(rawToken: string): Promise<{ user: User; token: ApiToken }> {
    const payload = await this.cryptoService.verifyJwtToken(rawToken);
    const token = await this.apiTokensRepo.findOne({
      where: { id: payload.tokenId },
    });
    if (!token) {
      throw new UnauthorizedException('Invalid token');
    }
    if (token.revokedAt) {
      throw new UnauthorizedException('Token revoked');
    }
    if (token.expiresAt && token.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Token expired');
    }

    const user = await this.usersRepo.findOne({
      where: { id: token.userId },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      user,
      token,
    };
  }
}
