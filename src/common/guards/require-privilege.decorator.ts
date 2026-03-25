import { SetMetadata } from '@nestjs/common';
import { ApiTokenPrivilege } from '@modules/api-tokens/api-token.entity';
import { REQUIRED_PRIVILEGE_KEY } from './api-token.guard';

export const RequirePrivilege = (privilege: ApiTokenPrivilege) => SetMetadata(REQUIRED_PRIVILEGE_KEY, privilege);
