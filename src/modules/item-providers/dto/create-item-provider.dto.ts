import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';

export class CreateItemProviderDto {
  @ApiProperty({ example: 'Main shop counter' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({
    required: false,
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'Only allowed for admin tokens. If omitted, binds to token user.',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}
