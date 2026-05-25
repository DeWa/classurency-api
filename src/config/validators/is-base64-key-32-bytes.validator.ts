import type { ValidationArguments, ValidatorConstraintInterface } from 'class-validator';
import { ValidatorConstraint } from 'class-validator';

/**
 * Ensures a value is valid base64 encoding exactly 32 bytes (e.g. AES-256 / JWT HMAC keys).
 */
@ValidatorConstraint({ name: 'isBase64Key32Bytes', async: false })
export class IsBase64Key32Bytes implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string' || value.length === 0) {
      return false;
    }
    try {
      return Buffer.from(value, 'base64').length === 32;
    } catch {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a base64 string that decodes to exactly 32 bytes`;
  }
}
