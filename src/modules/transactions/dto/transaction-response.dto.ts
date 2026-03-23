import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';
import type { TransactionType } from '../transaction.entity';

/**
 * Public transaction fields returned by the API.
 */
export class TransactionResponseDto {
  @ApiProperty({ description: 'Transaction ID' })
  @IsNumber()
  id!: number;

  @ApiProperty({ enum: ['MINT', 'PURCHASE'], description: 'Transaction kind' })
  @IsIn(['MINT', 'PURCHASE'])
  type!: TransactionType;

  @ApiProperty({ description: 'Transaction amount' })
  @IsNumber()
  amount!: number;

  @ApiPropertyOptional({ description: 'Description', nullable: true })
  @IsOptional()
  @IsString()
  description!: string | null;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsNotEmpty()
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Source account ID (payer); null when not applicable (e.g. mint)',
    nullable: true,
  })
  @ValidateIf((o: TransactionResponseDto) => o.fromAccountId !== null)
  @IsUUID()
  fromAccountId!: string | null;

  @ApiPropertyOptional({
    description: 'Destination account ID',
    nullable: true,
  })
  @ValidateIf((o: TransactionResponseDto) => o.toAccountId !== null)
  @IsUUID()
  toAccountId!: string | null;
}
