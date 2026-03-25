import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/**
 * Thrown when trying to create a user with an existing username.
 */
export class UserNameAlreadyExistsException extends ConflictException {
  constructor() {
    super('Username already exists');
  }
}

export function isUserNameAlreadyExistsError(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }
  const duplicateKeyErrorCode = '23505';
  const databaseError = error as QueryFailedError & { code?: string; detail?: string };
  const hasDuplicateCode = databaseError.code === duplicateKeyErrorCode;
  const hasUserNameReference = databaseError.detail?.includes('userName') ?? false;
  return hasDuplicateCode && hasUserNameReference;
}
