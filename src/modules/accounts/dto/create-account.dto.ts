import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    format: 'uuid',
    description: 'User id.',
  })
  @IsString()
  @IsNotEmpty()
  @IsUUID('4')
  userId!: string;
}
