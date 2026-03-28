import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { UserType } from '@modules/users/user.entity';
import { AccountListOwnerDto } from '@modules/accounts/dto/list-accounts.dto';

/** Default page size when the client omits the limit query parameter. */
export const DEFAULT_LIST_ITEM_PROVIDERS_LIMIT = 50;

/** Maximum allowed limit for admin item-provider list queries. */
export const MAX_LIST_ITEM_PROVIDERS_LIMIT = 100;

/**
 * Query parameters for GET /admin/item-providers.
 */
export class ListItemProvidersQueryDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'Return only providers linked to this user id.' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ enum: UserType, description: 'Return only providers whose owner has this user type.' })
  @IsOptional()
  @IsEnum(UserType)
  ownerType?: UserType;

  @ApiPropertyOptional({
    description:
      'Case-insensitive substring match on provider name, owner display name, owner login name, or linked account NFC UID.',
    maxLength: 128,
  })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() || undefined : value))
  @IsOptional()
  @IsString()
  @MaxLength(128)
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    default: DEFAULT_LIST_ITEM_PROVIDERS_LIMIT,
    description: `Page size (default ${DEFAULT_LIST_ITEM_PROVIDERS_LIMIT}, max ${MAX_LIST_ITEM_PROVIDERS_LIMIT}).`,
  })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(MAX_LIST_ITEM_PROVIDERS_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ type: Number, default: 0, description: 'Number of rows to skip (pagination).' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

/**
 * One item-provider row in an admin list response.
 */
export class ListItemProviderItemDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'uuid' })
  accountId!: string;

  @ApiProperty({ required: false, nullable: true, description: 'NFC card UID of the linked account when assigned.' })
  linkedAccountNfcCardUid!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;

  @ApiProperty({ type: AccountListOwnerDto, description: 'The user that owns this item provider.' })
  owner!: AccountListOwnerDto;
}

/**
 * Paginated list of item providers for admin.
 */
export class ListItemProvidersResponseDto {
  @ApiProperty({ type: [ListItemProviderItemDto] })
  itemProviders!: ListItemProviderItemDto[];

  @ApiProperty({ description: 'Total rows matching the filters (ignoring limit/offset).' })
  total!: number;
}
