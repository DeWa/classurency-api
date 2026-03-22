import { IsEnum, IsOptional, IsUUID } from 'class-validator';
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
  })
  @IsOptional()
  @IsEnum(ApiTokenPrivilege)
  privilege?: ApiTokenPrivilege;
}
