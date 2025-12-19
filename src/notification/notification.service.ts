import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { NotificationType, Prisma } from '@prisma/client';

type CreateNotificationInput = {
  recipientUserId: string;
  actorUserId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
};

@Injectable()
export class NotificationService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(input: CreateNotificationInput, prisma?: Prisma.TransactionClient) {
    const client = prisma ?? this.databaseService;
    return client.notification.create({
      data: {
        recipientUserId: input.recipientUserId,
        actorUserId: input.actorUserId ?? null,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data ?? undefined,
      },
    });
  }

  async listForUser(
    userId: string,
    opts?: { unreadOnly?: boolean; page?: number; limit?: number },
  ) {
    const page = Math.max(1, Number(opts?.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(opts?.limit ?? 20)));
    const skip = (page - 1) * limit;

    const where: any = { recipientUserId: userId };
    if (opts?.unreadOnly) {
      where.readAt = null;
    }

    const [items, total, unread] = await Promise.all([
      this.databaseService.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.databaseService.notification.count({ where }),
      this.databaseService.notification.count({
        where: { recipientUserId: userId, readAt: null },
      }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        unreadCount: unread,
      },
    };
  }

  async unreadCount(userId: string) {
    return this.databaseService.notification.count({
      where: { recipientUserId: userId, readAt: null },
    });
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.databaseService.notification.findFirst({
      where: { id: notificationId, recipientUserId: userId },
    });
    if (!existing) return null;

    if (existing.readAt) return existing;

    return this.databaseService.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    const result = await this.databaseService.notification.updateMany({
      where: { recipientUserId: userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
