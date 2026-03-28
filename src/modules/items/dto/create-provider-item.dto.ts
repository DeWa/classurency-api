import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';

export class CreateProviderItemDto {
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
    type: Number,
    example: 10,
    description: 'If omitted/null, stock is not tracked (unlimited).',
    nullable: true,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number | null;
}
