import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserType } from '@modules/users/user.entity';
import { CryptoService } from '@common/crypto/crypto.service';
import { ApiToken, ApiTokenPrivilege, ApiTokenType } from './api-token.entity';
import { RequestTokenDto } from './dto/request-token.dto';
import ms from 'ms';

const PRIVILEGE_RANK: Record<ApiTokenPrivilege, number> = {
  [ApiTokenPrivilege.USER]: 1,
  [ApiTokenPrivilege.PROVIDER]: 2,
  [ApiTokenPrivilege.ADMIN]: 3,
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
      maxPrivilege = ApiTokenPrivilege.ADMIN;
    } else if (userType === UserType.PROVIDER) {
      maxPrivilege = ApiTokenPrivilege.PROVIDER;
    } else {
      maxPrivilege = ApiTokenPrivilege.USER;
    }

    if (PRIVILEGE_RANK[privilege] > PRIVILEGE_RANK[maxPrivilege]) {
      throw new UnauthorizedException('Insufficient privileges');
    }
    return maxPrivilege;
  }

  async createToken(user: User, privilege: ApiTokenPrivilege, type: ApiTokenType) {
    const expirationTime = '180d'; // TODO: Change maybe?
    const expirationDate = new Date(Date.now() + ms(expirationTime));

    const jwtToken = this.cryptoService.generateJwtToken(
      {
        userId: user.id,
        userType: user.type,
        tokenId: crypto.randomUUID(),
        privilege,
        type,
      },
      expirationTime,
    );

    const token = this.apiTokensRepo.create({
      userId: user.id,
      privilege,
      type,
      tokenHash: jwtToken,
      expiresAt: expirationDate,
      revokedAt: null,
    });
    await this.apiTokensRepo.save(token);
    return token;
  }

  async createApiToken(dto: RequestTokenDto, reqAuthId: string) {
    const user = await this.usersRepo.findOne({
      where: { id: dto.userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id !== reqAuthId) {
      throw new UnauthorizedException('Invalid user');
    }

    this.ensureAllowedPrivilege(user.type, dto.privilege ?? ApiTokenPrivilege.USER);

    const privilege = dto.privilege ?? ApiTokenPrivilege.USER;

    const token = await this.createToken(user, privilege, ApiTokenType.API);

    return {
      token,
      privilege: token.privilege,
      expiresAt: token.expiresAt,
      userId: user.id,
      type: token.type,
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
