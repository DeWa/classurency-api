import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiTokenPrivilege } from '../api-token.entity';

export class RequestTokenDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    format: 'uuid',
    description: 'Target user id.',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    example: 'provider',
    enum: ApiTokenPrivilege,
    description: 'Requested privilege for the issued token (defaults to user).',
    required: false,
  })
  @IsOptional()
  @IsEnum(ApiTokenPrivilege)
  privilege?: ApiTokenPrivilege;
}

export class RequestTokenResponseDto {
  @ApiProperty({
    example:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTY3ODkwIiwidXNlclR5cGUiOiJ1c2VyIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    description: 'JWT token.',
  })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
