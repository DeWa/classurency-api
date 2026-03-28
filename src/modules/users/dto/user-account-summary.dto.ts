import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDate, IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Public account fields returned when listing a user's accounts (no secrets).
 */
export class UserAccountSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({
    nullable: true,
    description: 'NFC card UID when the account is bound to a card.',
    required: false,
  })
  @IsOptional()
  @IsString()
  nfcCardUid!: string | null;

  @ApiProperty({ description: 'Account public key (hex).' })
  @IsString()
  publicKeyHex!: string;

  @ApiProperty({ description: 'Current balance.' })
  @IsNumber()
  balance!: number;

  @ApiProperty({ description: 'Whether the account is locked.' })
  @IsBoolean()
  isLocked!: boolean;

  @ApiProperty()
  @IsDate()
  createdAt!: Date;

  @ApiProperty()
  @IsDate()
  updatedAt!: Date;
}
