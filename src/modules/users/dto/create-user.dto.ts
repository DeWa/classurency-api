import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    example: 'Ada Lovelace',
    maxLength: 128,
    description: 'User display name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  name!: string;

  @ApiProperty({
    example: 'a-long-random-secret',
    minLength: 8,
    maxLength: 128,
    description: 'Account password for API login (stored with Argon2id; distinct from the generated card PIN).',
  })
  @IsString()
  @Length(8, 128)
  password!: string;
}
