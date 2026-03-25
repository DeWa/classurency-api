import { IsEnum, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../user.entity';

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
}

export class CreateUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'User name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'User password' })
  @IsString()
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ description: 'User type' })
  @IsEnum(UserType)
  @IsNotEmpty()
  type!: UserType;
}
