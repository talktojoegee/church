import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AuditContextService } from '../audit/audit-context.service';
import { createPrismaAuditExtension } from './prisma-audit.extension';

function createExtendedPrismaClient(auditContext: AuditContextService) {
  const base = new PrismaClient();
  const extended = base.$extends(
    createPrismaAuditExtension(auditContext, async (input) => {
      await base.auditLog.create({
        data: {
          userId: input.userId ?? undefined,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata ? JSON.stringify(input.metadata) : undefined,
          ipAddress: input.ipAddress,
        },
      });
    }),
  );
  return { base, extended };
}

export type ExtendedPrismaClient = ReturnType<typeof createExtendedPrismaClient>['extended'];

/** Transaction callback client (matches extended Prisma `$transaction`). */
export type PrismaTransactionClient = Omit<
  ExtendedPrismaClient,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>;

/** Merges Prisma delegate typings onto the service class. */
export interface PrismaService extends ExtendedPrismaClient {}

/**
 * Prisma client with automatic audit-trail logging on all mutations.
 * Uses a proxy so existing `this.prisma.model.*` call sites keep working.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly base: PrismaClient;

  constructor(auditContext: AuditContextService) {
    const { base, extended } = createExtendedPrismaClient(auditContext);
    this.base = base;

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (prop in target || typeof prop === 'symbol') {
          return Reflect.get(target, prop, receiver);
        }
        return Reflect.get(extended as object, prop);
      },
    }) as PrismaService;
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.base.$connect();
      this.logger.log('Connected to MySQL database');
    } catch (error) {
      this.logger.error('Failed to connect to the database', error as Error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.base.$disconnect();
  }
}
