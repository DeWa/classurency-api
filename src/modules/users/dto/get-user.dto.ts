import { IsEnum, IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../user.entity';

export class GetUserRequestDto {
  @ApiProperty({
    description: 'User ID',
  })
  @IsUUID()
  @IsNotEmpty()
  id!: string;
}

export class GetUserResponseDto {
  @ApiProperty({
    description: 'User ID',
  })
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
