import { IsEnum, IsIn, IsUUID } from 'class-validator';
import { type ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { UserType } from '@modules/users/user.entity';

export class JwtPayload {
  @IsUUID()
  userId!: string;

  @IsEnum(UserType)
  userType!: UserType;

  @IsUUID()
  tokenId!: string;

  @IsIn(['admin', 'provider', 'user'])
  privilege!: ApiTokenPrivilege;
}
