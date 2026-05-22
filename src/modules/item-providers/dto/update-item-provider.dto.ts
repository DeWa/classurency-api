import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

/**
 * Body for PATCH /admin/item-providers/:id. At least one field must be sent.
 * When changing the linked user and account, both userId and accountId are required.
 */
export class UpdateItemProviderDto {
  @ApiPropertyOptional({ description: 'Display name', minLength: 1, maxLength: 128, required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  name?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Owning user id (must be sent together with accountId).',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Linked account id (must be sent together with userId).',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  accountId?: string;
}
