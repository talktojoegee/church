import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { SiteAdminController, SitePublicController } from './site.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [NotificationsModule, FinanceModule],
  controllers: [SitePublicController, SiteAdminController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
