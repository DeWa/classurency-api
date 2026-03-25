import {
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  ArrayMinSize,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PurchaseItemDto {
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

  @ApiProperty({
    description: 'Item ids (UUIDs) to purchase',
    type: [String],
    format: 'uuid',
    isArray: true,
    example: ['3fa85f64-5717-4562-b3fc-2c963f66afa6'],
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  items!: string[];
}

/**
 * Response body after a successful item purchase.
 */
export class PurchaseItemResponseDto {
  @ApiProperty({ description: 'Created purchase transaction id' })
  @IsNumber()
  transactionId!: number;

  @ApiProperty({
    description: 'Remaining stock per item id after the purchase (when stock is tracked).',
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { '3fa85f64-5717-4562-b3fc-2c963f66afa6': 9 },
  })
  @IsObject()
  remainingAmount!: Record<string, number>;
}
