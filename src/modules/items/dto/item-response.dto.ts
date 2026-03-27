import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsString, IsUUID, ValidateIf } from 'class-validator';

/**
 * Public item fields returned by the API.
 */
export class ItemResponseDto {
  @ApiProperty({ description: 'Item ID', format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Display name' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Description' })
  @IsString()
  description!: string;

  @ApiProperty({ description: 'Unit value' })
  @IsNumber()
  value!: number;

  @ApiProperty({
    description: 'Stock amount; null means unlimited / not tracked',
    nullable: true,
    type: Number,
  })
  @ValidateIf((o: ItemResponseDto) => o.amount !== null)
  @IsInt()
  amount!: number | null;

  @ApiProperty({ description: 'Owning item-provider ID', format: 'uuid' })
  @IsUUID()
  providerId!: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsNotEmpty()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsNotEmpty()
  updatedAt!: Date;
}
