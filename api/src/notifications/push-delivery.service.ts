import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import type { ServiceAccount } from 'firebase-admin/app';
import type { Messaging } from 'firebase-admin/messaging';
import { PrismaService } from '../prisma/prisma.service';
import type { NotifyPayload } from './notifications.service';

@Injectable()
export class PushDeliveryService implements OnModuleInit {
  private readonly logger = new Logger(PushDeliveryService.name);
  private messaging: Messaging | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      const jsonEnv = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim();
      const pathEnv = process.env.FCM_SERVICE_ACCOUNT_PATH?.trim();

      if (!jsonEnv && !pathEnv) {
        this.logger.log('FCM not configured — in-app notifications only');
        return;
      }

      // Lazy-load firebase-admin so shared hosts without FCM do not pull in grpc at startup.
      const { cert, getApps, initializeApp } = await import('firebase-admin/app');
      const { getMessaging } = await import('firebase-admin/messaging');

      let cred: ServiceAccount;
      if (jsonEnv) {
        cred = JSON.parse(jsonEnv) as ServiceAccount;
      } else {
        cred = JSON.parse(readFileSync(pathEnv!, 'utf8')) as ServiceAccount;
      }

      if (!getApps().length) {
        initializeApp({ credential: cert(cred) });
      }
      this.messaging = getMessaging();
      this.logger.log(
        jsonEnv ? 'FCM push delivery enabled (JSON credentials)' : 'FCM push delivery enabled (file credentials)',
      );
    } catch (err) {
      this.logger.warn(`FCM initialization failed: ${err}`);
      this.messaging = null;
    }
  }

  get isEnabled() {
    return this.messaging != null;
  }

  async sendToUsers(userIds: string[], payload: NotifyPayload) {
    if (!this.messaging || userIds.length === 0) return;

    const tokens = await this.prisma.devicePushToken.findMany({
      where: { userId: { in: userIds } },
      select: { token: true },
    });
    const registrationTokens = tokens.map((t) => t.token);
    if (registrationTokens.length === 0) return;

    try {
      const res = await this.messaging.sendEachForMulticast({
        tokens: registrationTokens,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...(payload.link ? { link: payload.link } : {}),
          ...(payload.type ? { type: payload.type } : {}),
        },
      });
      if (res.failureCount > 0) {
        this.logger.warn(`FCM: ${res.failureCount}/${registrationTokens.length} deliveries failed`);
      }
    } catch (err) {
      this.logger.warn(`FCM send failed: ${err}`);
    }
  }

  sendToUser(userId: string, payload: NotifyPayload) {
    return this.sendToUsers([userId], payload);
  }
}
