import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuditContextService } from '../audit/audit-context.service';

@Global()
@Module({
  providers: [AuditContextService, PrismaService],
  exports: [PrismaService, AuditContextService],
})
export class PrismaModule {}
