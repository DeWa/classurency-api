import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, Validate } from 'class-validator';
import { IsBase64Key32Bytes } from './validators/is-base64-key-32-bytes.validator';

const NODE_ENV_VALUES = ['development', 'production', 'test'] as const;

/**
 * Raw environment variables validated at application startup.
 */
export class EnvironmentVariables {
  @IsIn(NODE_ENV_VALUES)
  NODE_ENV: (typeof NODE_ENV_VALUES)[number];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  LOG_LEVEL?: string;

  @IsString()
  DB_HOST: string;

  @Transform(({ value }: { value: unknown }) => (value === undefined || value === '' ? undefined : Number(value)))
  @IsInt()
  @Min(1)
  @Max(65535)
  DB_PORT: number;

  @IsString()
  DB_USER: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  @IsNotEmpty()
  DB_NAME: string;

  @IsString()
  @IsNotEmpty()
  @Validate(IsBase64Key32Bytes)
  CLASSURENCY_MASTER_KEY!: string;

  @IsString()
  @IsNotEmpty()
  @Validate(IsBase64Key32Bytes)
  CLASSURENCY_CARD_EXPORT_KEY!: string;

  @IsOptional()
  @IsString()
  SWAGGER_ENABLED?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SWAGGER_PATH?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SWAGGER_TITLE?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SWAGGER_DESCRIPTION?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SWAGGER_VERSION?: string;

  @IsOptional()
  @IsString()
  SWAGGER_WRITE_ON_BOOT?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  SWAGGER_OUTPUT_PATH?: string;
}
