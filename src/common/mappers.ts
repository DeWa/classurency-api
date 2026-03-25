import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { UserType } from '@modules/users/user.entity';

export function mapUserToApiTokenPrivilege(userType: UserType): ApiTokenPrivilege {
  if (userType === UserType.ADMIN) {
    return ApiTokenPrivilege.ADMIN;
  } else if (userType === UserType.PROVIDER) {
    return ApiTokenPrivilege.PROVIDER;
  } else {
    return ApiTokenPrivilege.USER;
  }
}
