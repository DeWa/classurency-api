import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ApiTokensService } from '@modules/api-tokens/api-tokens.service';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { UserType } from '@modules/users/user.entity';

export const REQUIRED_PRIVILEGE_KEY = 'requiredPrivilege';

export type ApiAuthContext = {
  userId: string;
  privilege: ApiTokenPrivilege;
  userType: UserType;
};

const PRIVILEGE_RANK: Record<ApiTokenPrivilege, number> = {
  user: 1,
  provider: 2,
  admin: 3,
};

function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

@Injectable()
@ApiHeader({
  name: 'x-api-token',
  required: false,
  description: 'API token. Alternatively, send it as an Authorization: Bearer <token> header.',
})
export class ApiTokenGuard implements CanActivate {
  constructor(
    private readonly apiTokensService: ApiTokensService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request & { apiAuth?: ApiAuthContext }>();

    const bearer = extractBearerToken(req.header('authorization'));
    const xApiToken = req.header('x-api-token');
    const rawToken = bearer ?? xApiToken ?? null;
    if (!rawToken) {
      throw new UnauthorizedException('Missing API token');
    }

    try {
      const { user, token } = await this.apiTokensService.validateToken(rawToken);
      const auth = {
        userId: user.id,
        privilege: token.privilege,
        userType: user.type,
      };
      req.apiAuth = auth;

      const required = this.reflector.getAllAndOverride<ApiTokenPrivilege | undefined>(REQUIRED_PRIVILEGE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);
      if (!required) return true;

      if (PRIVILEGE_RANK[auth.privilege] < PRIVILEGE_RANK[required]) {
        throw new UnauthorizedException('Insufficient privileges');
      }
      return true;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
