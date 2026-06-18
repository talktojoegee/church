import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import {
  NotificationQueryDto,
  RegisterDeviceTokenDto,
  UnregisterDeviceTokenDto,
} from './dto/notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  findMany(@CurrentUser('id') userId: string, @Query() query: NotificationQueryDto) {
    return this.notifications.findMany(userId, query);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser('id') userId: string) {
    return this.notifications.unreadCount(userId).then((count) => ({ count }));
  }

  @Patch('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notifications.markAllRead(userId);
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notifications.markRead(userId, id);
  }

  @Post('device-tokens')
  registerToken(
    @CurrentUser() user: AuthUser,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notifications.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('device-tokens')
  unregisterToken(
    @CurrentUser('id') userId: string,
    @Body() dto: UnregisterDeviceTokenDto,
  ) {
    return this.notifications.unregisterDeviceToken(userId, dto.token);
  }
}
