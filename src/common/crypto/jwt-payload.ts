import { IsEnum, IsUUID } from 'class-validator';
import { ApiTokenPrivilege, ApiTokenType } from '@modules/api-tokens/api-token.entity';
import { UserType } from '@modules/users/user.entity';

export class JwtPayload {
  @IsUUID()
  userId!: string;

  @IsEnum(UserType)
  userType!: UserType;

  @IsUUID()
  tokenId!: string;

  @IsEnum(ApiTokenPrivilege)
  privilege!: ApiTokenPrivilege;

  @IsEnum(ApiTokenType)
  type!: ApiTokenType;
}
