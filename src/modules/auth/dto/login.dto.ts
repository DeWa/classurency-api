import { IsDate, IsEnum, IsNotEmpty, IsString, IsUUID, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ApiTokenPrivilege, ApiTokenType } from '@modules/api-tokens/api-token.entity';

export class LoginDto {
  @ApiProperty({
    example: 'alice_2',
    description: 'User username (letters, digits, - _ + only; no spaces)',
    maxLength: 128,
    pattern: '^[-a-zA-Z0-9_+]+$',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  @Matches(/^[-a-zA-Z0-9_+]+$/, {
    message: 'username must not contain spaces and may only use letters, numbers, and - _ +',
  })
  userName!: string;

  @ApiProperty({
    example: 'a-long-random-secret',
    minLength: 6,
    maxLength: 128,
    description: 'Account password for API login (Distinct from the generated card PIN).',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 128)
  password!: string;
}

export class LoginResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwidXNlclR5cGUiOiJ1c2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    description: 'JWT token',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;

  @ApiProperty({ example: 'user', description: 'Privilege' })
  @IsEnum(ApiTokenPrivilege)
  @IsNotEmpty()
  privilege!: ApiTokenPrivilege;

  @ApiProperty({ example: '2026-03-22T12:00:00.000Z', description: 'Token expiration date' })
  @IsDate()
  @IsNotEmpty()
  expiresAt!: Date | null;

  @ApiProperty({ example: '3fa85f64-5717-4562-b3fc-2c963f66afa6', format: 'uuid', description: 'User ID' })
  @IsUUID()
  @IsNotEmpty()
  userId!: string;

  @ApiProperty({ example: ApiTokenType.LOGIN, enum: ApiTokenType, description: 'Token type' })
  @IsEnum(ApiTokenType)
  @IsNotEmpty()
  type!: ApiTokenType;
}
