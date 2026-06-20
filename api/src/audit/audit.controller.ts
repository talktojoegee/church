import { Controller, Get, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditQueryDto } from './dto/audit-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @Permissions('system.audit.view')
  findMany(@Query() query: AuditQueryDto) {
    return this.audit.findMany(query);
  }
}
