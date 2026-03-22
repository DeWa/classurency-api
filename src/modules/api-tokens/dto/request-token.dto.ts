import { IsIn, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ApiTokenPrivilege } from '../api-token.entity';

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
    enum: ['admin', 'provider', 'user'],
    description: 'Requested privilege for the issued token (defaults to user).',
  })
  @IsOptional()
  @IsIn(['admin', 'provider', 'user'])
  privilege?: ApiTokenPrivilege;
}
