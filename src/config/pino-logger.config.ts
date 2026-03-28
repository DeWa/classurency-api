import type { Params } from 'nestjs-pino';

const NODE_ENV: string = process.env.NODE_ENV ?? 'development';
const isProduction: boolean = NODE_ENV === 'production';
const isTest: boolean = NODE_ENV === 'test';
const DEFAULT_LOG_LEVEL: string = isProduction ? 'info' : 'debug';

/**
 * Options for nestjs-pino: HTTP request/response logging and application logger binding.
 */
export function createPinoLoggerParams(): Params {
  const level: string = process.env.LOG_LEVEL ?? (isTest ? 'silent' : DEFAULT_LOG_LEVEL);
  const redact: { paths: string[]; remove: boolean } = {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  };
  if (isTest) {
    return {
      pinoHttp: {
        level,
        autoLogging: level !== 'silent',
        transport: undefined,
        redact,
      },
    };
  }
  return {
    pinoHttp: {
      level,
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
