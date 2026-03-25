import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
