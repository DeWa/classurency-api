import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { UserType } from '@modules/users/user.entity';

/** Default page size when the client omits the limit query parameter. */
export const DEFAULT_LIST_ACCOUNTS_LIMIT = 50;

/** Maximum allowed limit for admin account list queries. */
export const MAX_LIST_ACCOUNTS_LIMIT = 100;

/**
 * Account owner (user) fields included in admin account list responses (no secrets).
 */
export class AccountListOwnerDto {
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
 * Query parameters for GET /accounts (admin).
 */
export class ListAccountsQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Return only accounts owned by this user.' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: UserType, description: 'Return only accounts whose owner has this user type.' })
  @IsOptional()
  @IsEnum(UserType)
  ownerType?: UserType;

  @ApiPropertyOptional({ description: 'Return only locked (true) or unlocked (false) accounts.' })
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === true || value === 'true') {
      return true;
    }
    if (value === false || value === 'false') {
      return false;
    }
    return value;
  })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match on NFC card UID, owner display name, or owner login name (userName).',
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    default: DEFAULT_LIST_ACCOUNTS_LIMIT,
    description: `Page size (default ${DEFAULT_LIST_ACCOUNTS_LIMIT}, max ${MAX_LIST_ACCOUNTS_LIMIT}).`,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_ACCOUNTS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ type: Number, default: 0, description: 'Number of rows to skip (pagination).' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * One account row in an admin list response (no PIN or private key material).
 */
export class ListAccountItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ required: false, nullable: true, description: 'NFC card UID when assigned.' })
  nfcCardUid!: string | null;

  @ApiProperty()
  publicKeyHex!: string;

  @ApiProperty({ type: Number, description: 'Account balance.' })
  balance!: number;

  @ApiProperty()
  isLocked!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: AccountListOwnerDto, description: 'The user that owns this account.' })
  owner!: AccountListOwnerDto;
}

/**
 * Paginated list of accounts for admin.
 */
export class ListAccountsResponseDto {
  @ApiProperty({ type: [ListAccountItemDto] })
  accounts!: ListAccountItemDto[];

  @ApiProperty({ description: 'Total rows matching the filters (ignoring limit/offset).' })
  total!: number;
}
