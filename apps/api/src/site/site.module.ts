import { Module } from '@nestjs/common';
import { SiteService } from './site.service';
import { SiteAdminController, SitePublicController } from './site.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SitePublicController, SiteAdminController],
  providers: [SiteService],
  exports: [SiteService],
})
export class SiteModule {}
