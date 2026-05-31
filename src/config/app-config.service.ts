import { Injectable } from '@nestjs/common';
import type { AppConfig, CryptoConfig, DatabaseConfig, SwaggerConfig } from './app.config';
import { getAppConfig } from './app.config';

/**
 * Injectable access to validated application configuration.
 */
@Injectable()
export class AppConfigService {
  private readonly config: AppConfig = getAppConfig();

  get nodeEnv(): string {
    return this.config.nodeEnv;
  }

  get isProduction(): boolean {
    return this.config.isProduction;
  }

  get isTest(): boolean {
    return this.config.isTest;
  }

  get port(): number {
    return this.config.port;
  }

  get logLevel(): string {
    return this.config.logLevel;
  }

  get database(): DatabaseConfig {
    return this.config.database;
  }

  get crypto(): CryptoConfig {
    return this.config.crypto;
  }

  get swagger(): SwaggerConfig {
    return this.config.swagger;
  }

  get values(): AppConfig {
    return this.config;
  }
}
