import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

/**
 * Public item-provider fields returned by the API.
 */
export class ItemProviderResponseDto {
  @ApiProperty({ description: 'Item-provider ID', format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ description: 'Owning user ID', format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ description: 'Linked account ID', format: 'uuid' })
  @IsUUID()
  accountId!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsNotEmpty()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsNotEmpty()
  updatedAt!: Date;
}
