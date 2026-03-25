import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Min } from 'class-validator';

export class CreateItemDto {
  @ApiProperty({ example: 'Soda can' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ example: '330ml soda' })
  @IsString()
  @Length(1, 2000)
  description!: string;

  @ApiProperty({ example: 1.5, description: 'Price in currency units.' })
  @IsNumber()
  @Min(0.01)
  value!: number;

  @ApiProperty({
    required: false,
    example: 10,
    description: 'If omitted/null, stock is not tracked (unlimited).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Which provider sells this item.',
  })
  @IsUUID()
  providerId!: string;
}

