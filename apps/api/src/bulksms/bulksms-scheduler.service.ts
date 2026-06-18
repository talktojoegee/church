import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BulkSmsService } from './bulksms.service';

@Injectable()
export class BulkSmsSchedulerService {
  private readonly logger = new Logger(BulkSmsSchedulerService.name);
  private running = false;

  constructor(private readonly bulkSms: BulkSmsService) {}

  /** Check every minute for SMS schedules that are due. */
  @Cron(CronExpression.EVERY_MINUTE)
  async processDueSchedules() {
    if (this.running) return;
    this.running = true;
    try {
      const count = await this.bulkSms.processDueSchedules();
      if (count > 0) {
        this.logger.log(`Processed ${count} due SMS schedule(s)`);
      }
    } catch (err) {
      this.logger.error(
        'Failed to process SMS schedules',
        err instanceof Error ? err.stack : String(err),
      );
    } finally {
      this.running = false;
    }
  }
}
