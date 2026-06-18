import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/pagination';
import { NotificationQueryDto } from './dto/notification.dto';
import { PushDeliveryService } from './push-delivery.service';

export type NotifyPayload = {
  title: string;
  body?: string;
  type?: string;
  link?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushDeliveryService,
  ) {}

  async findMany(userId: string, query: NotificationQueryDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.UserNotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.userNotification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...skipTake(page, pageSize),
      }),
      this.prisma.userNotification.count({ where }),
    ]);
    return paginate(data, total, page, pageSize);
  }

  unreadCount(userId: string) {
    return this.prisma.userNotification.count({
      where: { userId, readAt: null },
    });
  }

  async markRead(userId: string, id: string) {
    const item = await this.prisma.userNotification.findFirst({
      where: { id, userId },
    });
    if (!item) throw new NotFoundException('Notification not found');
    return this.prisma.userNotification.update({
      where: { id },
      data: { readAt: item.readAt ?? new Date() },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.userNotification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async notifyUser(userId: string, payload: NotifyPayload) {
    const item = await this.prisma.userNotification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type ?? 'GENERAL',
        link: payload.link,
        metadata: payload.metadata,
      },
    });
    void this.push.sendToUser(userId, payload);
    return item;
  }

  async notifyUsers(userIds: string[], payload: NotifyPayload) {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return [];
    await this.prisma.userNotification.createMany({
      data: unique.map((userId) => ({
        userId,
        title: payload.title,
        body: payload.body,
        type: payload.type ?? 'GENERAL',
        link: payload.link,
        metadata: payload.metadata ?? undefined,
      })),
    });
    void this.push.sendToUsers(unique, payload);
    return unique;
  }

  async findUserIdsWithPermission(permissionKey: string, branchId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        ...(branchId ? { branchId } : {}),
        OR: [
          { isSuperAdmin: true },
          {
            roles: {
              some: {
                role: {
                  permissions: {
                    some: { permission: { key: permissionKey } },
                  },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  registerDeviceToken(userId: string, token: string, platform: string) {
    return this.prisma.devicePushToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform, updatedAt: new Date() },
    });
  }

  unregisterDeviceToken(userId: string, token: string) {
    return this.prisma.devicePushToken.deleteMany({
      where: { userId, token },
    });
  }
}
