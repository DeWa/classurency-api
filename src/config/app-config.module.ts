import { Global, Module } from '@nestjs/common';
import { AppConfigService } from './app-config.service';

/**
 * Global module exposing validated application configuration.
 */
@Global()
@Module({
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
