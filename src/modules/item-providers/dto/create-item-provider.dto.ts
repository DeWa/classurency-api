import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, Length } from 'class-validator';

export class CreateItemProviderDto {
  @ApiProperty({ example: 'Main shop counter' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    description: 'The user that owns this provider.',
  })
  @IsUUID()
  userId!: string;

  @ApiProperty({
    example: '9c7bb5eb-1684-49b2-bf1d-7f8ec8f0b6a4',
    description: 'Account to receive funds for this provider. Must belong to userId.',
  })
  @IsUUID()
  accountId!: string;
}
