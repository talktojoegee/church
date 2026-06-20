import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuditContextService } from './audit-context.service';

@Injectable()
export class AuditContextInterceptor implements NestInterceptor {
  constructor(private readonly auditContext: AuditContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      user?: { id: string };
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    }>();

    const userId = req.user?.id;
    const forwarded = req.headers?.['x-forwarded-for'];
    const ipAddress =
      req.ip ??
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined);

    const store = { userId, ipAddress };

    return new Observable((subscriber) => {
      this.auditContext.run(store, () => {
        next.handle().subscribe({
          next: (value) => subscriber.next(value),
          error: (err) => subscriber.error(err),
          complete: () => subscriber.complete(),
        });
      });
    });
  }
}
