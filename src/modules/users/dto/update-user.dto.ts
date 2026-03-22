import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../user.entity';

export class UpdateUserRequestDto {
  @ApiProperty({
    example: 'Ada Lovelace',
    maxLength: 128,
    description: 'User display name.',
  })
  @IsString()
  @IsOptional()
  @MaxLength(128)
  name?: string;

  @ApiProperty({
    example: 'a-long-random-secret',
    minLength: 6,
    maxLength: 128,
    description: 'Account password for API login (stored with Argon2id; distinct from the generated card PIN).',
  })
  @IsString()
  @IsOptional()
  @Length(6, 128)
  password?: string;

  @ApiProperty({
    example: 'admin',
    enum: UserType,
    description: 'User type.',
  })
  @IsEnum(UserType)
  @IsOptional()
  type?: UserType;
}

export class UpdateUserResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'User name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'User type' })
  @IsEnum(UserType)
  @IsNotEmpty()
  type!: UserType;
}
