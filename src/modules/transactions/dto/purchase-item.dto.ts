import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class PurchaseItemDto {
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

  @ApiProperty({
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    format: 'uuid',
    description: 'Provider account id (vending machine, cafeteria, etc.) that sells the item.',
  })
  @IsUUID()
  providerAccountId!: string;

  @ApiPropertyOptional({
    example: 'Cafeteria lunch',
    maxLength: 500,
    description: 'Optional purchase description.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => String)
  items!: string[];
}
