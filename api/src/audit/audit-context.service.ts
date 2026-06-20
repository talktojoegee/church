import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AuditContextStore {
  userId?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditContextService {
  private readonly storage = new AsyncLocalStorage<AuditContextStore>();

  run<T>(store: AuditContextStore, fn: () => T): T {
    return this.storage.run(store, fn);
  }

  get(): AuditContextStore | undefined {
    return this.storage.getStore();
  }
}
