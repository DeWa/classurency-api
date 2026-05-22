import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { UserType } from '../user.entity';

/** Default page size when the client omits the limit query parameter. */
export const DEFAULT_LIST_USERS_LIMIT = 50;

/** Maximum allowed limit for admin user list queries. */
export const MAX_LIST_USERS_LIMIT = 100;

/**
 * Query parameters for GET /users (admin).
 */
export class ListUsersQueryDto {
  @ApiPropertyOptional({ enum: UserType, description: 'Return only users of this type.', required: false })
  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @ApiPropertyOptional({
    description: 'Case-insensitive substring match on display name or login name (userName).',
    maxLength: 128,
    required: false,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    default: DEFAULT_LIST_USERS_LIMIT,
    description: `Page size (default ${DEFAULT_LIST_USERS_LIMIT}, max ${MAX_LIST_USERS_LIMIT}).`,
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_USERS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({
    type: Number,
    default: 0,
    description: 'Number of rows to skip (pagination).',
    required: false,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * One user row in an admin list response (no secrets).
 */
export class ListUserItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  userName!: string;

  @ApiProperty({ enum: UserType })
  type!: UserType;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

/**
 * Paginated list of users for admin.
 */
export class ListUsersResponseDto {
  @ApiProperty({ type: [ListUserItemDto] })
  users!: ListUserItemDto[];

  @ApiProperty({ description: 'Total rows matching the filters (ignoring limit/offset).' })
  total!: number;
}
