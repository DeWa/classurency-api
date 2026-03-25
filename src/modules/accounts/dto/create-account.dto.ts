import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Response body returned after creating an account (includes one-time card credentials).
 */
export class CreateAccountResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  @IsNotEmpty()
  id!: string;

  @ApiProperty({ description: 'User display name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'NFC card UID assigned to the account' })
  @IsString()
  @IsNotEmpty()
  nfcCardUid!: string;

  @ApiProperty({ description: 'Account public key (hex)' })
  @IsString()
  @IsNotEmpty()
  publicKeyHex!: string;

  @ApiProperty({ description: '4-digit PIN for the NFC card' })
  @IsString()
  @IsNotEmpty()
  pin!: string;

  @ApiProperty({
    description: 'Encrypted private key for programming onto the card (one-time delivery).',
  })
  @IsString()
  @IsNotEmpty()
  encryptedPrivateKeyForCard!: string;
}

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
