import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Body for PATCH /admin/accounts/:accountId. At least one field must be sent.
 */
export class UpdateAccountAdminDto {
  @ApiPropertyOptional({ description: 'When true, the account cannot be used for login or transfers until unlocked.' })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}

/**
 * Response for PATCH /admin/accounts/:accountId.
 */
export class AdminAccountPatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  isLocked!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
