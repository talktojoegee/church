import { Module } from '@nestjs/common';
import { BulkSmsController } from './bulksms.controller';
import { BulkSmsService } from './bulksms.service';
import { BulkSmsGatewayService } from './bulksms-gateway.service';
import { BulkSmsSchedulerService } from './bulksms-scheduler.service';

@Module({
  controllers: [BulkSmsController],
  providers: [BulkSmsService, BulkSmsGatewayService, BulkSmsSchedulerService],
  exports: [BulkSmsService],
})
export class BulkSmsModule {}
