import { Injectable, NotFoundException } from '@nestjs/common';
import { FollowUpStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateFollowUpDto, UpdateFollowUpDto } from './dto/followup.dto';

const memberSel = { select: { id: true, firstName: true, lastName: true, phone: true, email: true } };
const branchSel = { select: { id: true, name: true } };

@Injectable()
export class FollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  list(status?: FollowUpStatus, branchId?: string, assignedToId?: string) {
    const where: Prisma.FollowUpWhereInput = {
      ...(status ? { status } : {}),
      ...(branchId ? { branchId } : {}),
      ...(assignedToId ? { assignedToId } : {}),
    };
    return this.prisma.followUp.findMany({
      where,
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: { branch: branchSel, member: memberSel },
    });
  }

  async findOne(id: string) {
    const item = await this.prisma.followUp.findUnique({
      where: { id },
      include: { branch: branchSel, member: memberSel },
    });
    if (!item) throw new NotFoundException('Follow-up not found');
    return item;
  }

  async create(dto: CreateFollowUpDto, userId?: string) {
    const { dueDate, ...rest } = dto;
    const item = await this.prisma.followUp.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        createdById: userId,
      },
      include: { branch: branchSel, member: memberSel },
    });
    if (item.assignedToId) {
      const memberName = item.member
        ? `${item.member.firstName} ${item.member.lastName}`.trim()
        : item.contactName ?? 'Follow-up';
      await this.notifications.notifyUser(item.assignedToId, {
        title: 'Follow-up assigned to you',
        body: memberName,
        type: 'FOLLOW_UP',
        link: `/follow-ups/${item.id}`,
      });
    }
    return item;
  }

  async update(id: string, dto: UpdateFollowUpDto) {
    await this.findOne(id);
    const { dueDate, status, ...rest } = dto;
    return this.prisma.followUp.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(status === FollowUpStatus.COMPLETED ? { completedAt: new Date() } : {}),
      },
      include: { branch: branchSel, member: memberSel },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.followUp.delete({ where: { id } });
    return { success: true };
  }

  stats(branchId?: string) {
    const where: Prisma.FollowUpWhereInput = branchId ? { branchId } : {};
    return this.prisma.followUp.groupBy({
      by: ['status'],
      where,
      _count: true,
    });
  }
}
