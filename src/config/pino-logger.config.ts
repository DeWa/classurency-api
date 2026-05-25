import type { Params } from 'nestjs-pino';
import type { AppConfigService } from './app-config.service';

/**
 * Options for nestjs-pino: HTTP request/response logging and application logger binding.
 */
export function createPinoLoggerParams(appConfig: AppConfigService): Params {
  const { logLevel, isProduction, isTest } = appConfig;
  const redact: { paths: string[]; remove: boolean } = {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  };
  if (isTest) {
    return {
      pinoHttp: {
        level: logLevel,
        autoLogging: logLevel !== 'silent',
        transport: undefined,
        redact,
      },
    };
  }
  return {
    pinoHttp: {
      level: logLevel,
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: { singleLine: true },
          },
      redact,
    },
  };
}
