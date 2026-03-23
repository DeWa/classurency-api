import { Type } from 'class-transformer';
import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserType } from '../user.entity';
import { UserAccountSummaryDto } from './user-account-summary.dto';

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

  @ApiProperty({
    required: false,
    type: [UserAccountSummaryDto],
    description: 'Included when the request uses includeAccounts=true.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserAccountSummaryDto)
  accounts?: UserAccountSummaryDto[];
}
