import { IsNotEmpty, IsString, Length, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CheckBalanceDto {
  @ApiProperty({
    example: '04A224B1C83A80',
    maxLength: 128,
    description: 'NFC card UID (as read from the card reader).',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  nfcCardUid!: string;

  @ApiProperty({
    example: '1234',
    minLength: 4,
    maxLength: 4,
    description: '4-digit PIN set on the card.',
  })
  @IsString()
  @IsNotEmpty()
  @Length(4, 4)
  pin!: string;

  @ApiProperty({
    example: 'BASE64_ENCRYPTED_PRIVATE_KEY_FROM_CARD==',
    description: 'Encrypted private key blob read from the NFC card (base64 string).',
  })
  @IsString()
  @IsNotEmpty()
  encryptedPrivateKeyFromCard!: string;
}
