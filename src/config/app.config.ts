import { plainToInstance } from 'class-transformer';
import { validateSync, type ValidationError } from 'class-validator';
import { EnvironmentVariables } from './environment-variables';

const DEFAULT_PORT = 3000;
const DEFAULT_SWAGGER_PATH = 'docs';
const DEFAULT_SWAGGER_TITLE = 'Classurency API';
const DEFAULT_SWAGGER_DESCRIPTION = 'API documentation for the Classurency backend.';
const DEFAULT_SWAGGER_VERSION = '0.0.1';
const DEFAULT_SWAGGER_OUTPUT_PATH = 'docs/openapi.json';
const PRODUCTION_LOG_LEVEL = 'info';
const DEVELOPMENT_LOG_LEVEL = 'debug';
const TEST_LOG_LEVEL = 'silent';

export interface DatabaseConfig {
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly database: string;
}

export interface CryptoConfig {
  readonly masterKey: Buffer;
  readonly cardExportKey: Buffer;
}

export interface SwaggerConfig {
  readonly enabled: boolean;
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly version: string;
  readonly writeOnBoot: boolean;
  readonly outputPath: string;
}

/**
 * Validated, typed application configuration derived from environment variables.
 */
export interface AppConfig {
  readonly nodeEnv: string;
  readonly isProduction: boolean;
  readonly isTest: boolean;
  readonly port: number;
  readonly logLevel: string;
  readonly database: DatabaseConfig;
  readonly crypto: CryptoConfig;
  readonly swagger: SwaggerConfig;
}

let cachedAppConfig: AppConfig | undefined;

const KNOWN_ENV_KEYS: readonly (keyof EnvironmentVariables)[] = [
  'NODE_ENV',
  'PORT',
  'LOG_LEVEL',
  'DB_HOST',
  'DB_PORT',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME',
  'CLASSURENCY_MASTER_KEY',
  'CLASSURENCY_CARD_EXPORT_KEY',
  'SWAGGER_ENABLED',
  'SWAGGER_PATH',
  'SWAGGER_TITLE',
  'SWAGGER_DESCRIPTION',
  'SWAGGER_VERSION',
  'SWAGGER_WRITE_ON_BOOT',
  'SWAGGER_OUTPUT_PATH',
];

function pickKnownEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of KNOWN_ENV_KEYS) {
    if (config[key] !== undefined) {
      picked[key] = config[key];
    }
  }
  return picked;
}

function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined || value === '') {
    return defaultValue;
  }
  return value.toLowerCase() !== 'false';
}

function formatValidationErrors(errors: ValidationError[]): string {
  const messages: string[] = [];
  const collect = (error: ValidationError, prefix: string): void => {
    const property = prefix ? `${prefix}.${error.property}` : error.property;
    if (error.constraints) {
      for (const message of Object.values(error.constraints)) {
        messages.push(`${property}: ${message}`);
      }
    }
    if (error.children) {
      for (const child of error.children) {
        collect(child, property);
      }
    }
  };
  for (const error of errors) {
    collect(error, '');
  }
  return messages.join('\n');
}

/**
 * Validates environment variables and returns the parsed DTO.
 */
export function validateEnvironmentVariables(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, pickKnownEnvironment(config), {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
    whitelist: true,
  });
  if (errors.length > 0) {
    throw new Error(`Environment validation failed:\n${formatValidationErrors(errors)}`);
  }
  return validatedConfig;
}

/**
 * Maps validated environment variables to typed application configuration.
 */
export function buildAppConfig(env: EnvironmentVariables): AppConfig {
  const nodeEnv = env.NODE_ENV;
  const isProduction = nodeEnv === 'production';
  const isTest = nodeEnv === 'test';
  const defaultLogLevel = isTest ? TEST_LOG_LEVEL : isProduction ? PRODUCTION_LOG_LEVEL : DEVELOPMENT_LOG_LEVEL;
  const logLevel = env.LOG_LEVEL ?? defaultLogLevel;
  const swaggerEnabled = parseBooleanEnv(env.SWAGGER_ENABLED, true) && !isProduction;
  return {
    nodeEnv,
    isProduction,
    isTest,
    port: env.PORT ?? DEFAULT_PORT,
    logLevel,
    database: {
      host: env.DB_HOST,
      port: env.DB_PORT,
      username: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
    },
    crypto: {
      masterKey: Buffer.from(env.CLASSURENCY_MASTER_KEY, 'base64'),
      cardExportKey: Buffer.from(env.CLASSURENCY_CARD_EXPORT_KEY, 'base64'),
    },
    swagger: {
      enabled: swaggerEnabled,
      path: env.SWAGGER_PATH ?? DEFAULT_SWAGGER_PATH,
      title: env.SWAGGER_TITLE ?? DEFAULT_SWAGGER_TITLE,
      description: env.SWAGGER_DESCRIPTION ?? DEFAULT_SWAGGER_DESCRIPTION,
      version: env.SWAGGER_VERSION ?? DEFAULT_SWAGGER_VERSION,
      writeOnBoot: parseBooleanEnv(env.SWAGGER_WRITE_ON_BOOT, true),
      outputPath: env.SWAGGER_OUTPUT_PATH ?? DEFAULT_SWAGGER_OUTPUT_PATH,
    },
  };
}

/**
 * Stores validated configuration for reuse after Nest {@link ConfigModule} validation.
 */
export function setAppConfigCache(config: AppConfig): void {
  cachedAppConfig = config;
}

/**
 * Clears the cached configuration (for tests that mutate `process.env` before bootstrap).
 */
export function resetAppConfigCache(): void {
  cachedAppConfig = undefined;
}

/**
 * Returns validated application configuration, validating on first access.
 */
export function getAppConfig(): AppConfig {
  if (cachedAppConfig !== undefined) {
    return cachedAppConfig;
  }
  const env = validateEnvironmentVariables(process.env as Record<string, unknown>);
  cachedAppConfig = buildAppConfig(env);
  return cachedAppConfig;
}

/**
 * Nest {@link ConfigModule} `validate` hook: validates env and warms the config cache.
 */
export function validateAndCacheEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const env = validateEnvironmentVariables(config);
  setAppConfigCache(buildAppConfig(env));
  return env;
}
