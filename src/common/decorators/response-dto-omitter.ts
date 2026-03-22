import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import { getMetadataStorage } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { map } from 'rxjs/operators';

/**
 * Picks only properties that belong to the response DTO class (no `@Expose` needed).
 * Keys come from an empty instance plus class-validator metadata (covers optional fields).
 */
function getDeclaredDtoKeys(dto: Type<unknown>): string[] {
  const ctor = dto as new () => Record<string, unknown>;
  const keys = new Set<string>(Object.keys(new ctor()));
  try {
    const metadatas = getMetadataStorage().getTargetValidationMetadatas(
      dto as unknown as new (...args: never[]) => object,
      '',
      false,
      false,
    );
    for (const meta of metadatas) {
      if (meta.propertyName) keys.add(meta.propertyName);
    }
  } catch {
    /* DTO may have no validators */
  }
  return [...keys];
}

@Injectable()
export class ResponseDtoOmitter implements NestInterceptor {
  constructor(private readonly dto: Type<unknown>) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => this.toDtoShape(data)));
  }

  private toDtoShape(data: unknown): unknown {
    if (Array.isArray(data)) {
      return data.map((item) => this.pickToDto(item));
    }
    return this.pickToDto(data);
  }

  private pickToDto(data: unknown): unknown {
    if (data === null || typeof data !== 'object') {
      return data;
    }
    const keys = getDeclaredDtoKeys(this.dto);
    const src = data as Record<string, unknown>;
    const picked: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in src) {
        picked[key] = src[key];
      }
    }
    return plainToInstance(this.dto, picked);
  }
}
