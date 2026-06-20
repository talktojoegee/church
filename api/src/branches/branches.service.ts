import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

const pastorSel = {
  select: { id: true, firstName: true, lastName: true, phone: true, photoUrl: true, pastoralRole: true },
};

@Injectable()
export class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Resolve the single church record (this install = one church org). */
  private async getChurchId(): Promise<string> {
    const church = await this.prisma.church.findFirst({ select: { id: true } });
    if (!church) throw new NotFoundException('Church is not configured');
    return church.id;
  }

  async findMany() {
    return this.prisma.branch.findMany({
      orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
      include: {
        branchPastor: pastorSel,
        assistantPastor: pastorSel,
        _count: {
          select: {
            members: true,
            users: true,
            departments: true,
            groups: true,
            events: true,
            outreaches: true,
            attendanceSessions: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        branchPastor: pastorSel,
        assistantPastor: pastorSel,
        _count: { select: { members: true, users: true, departments: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');
    return branch;
  }

  /** Rich branch dashboard payload. */
  async getDetails(id: string) {
    const branch = await this.prisma.branch.findUnique({
      where: { id },
      include: {
        branchPastor: pastorSel,
        assistantPastor: pastorSel,
        church: { select: { name: true, currency: true } },
      },
    });
    if (!branch) throw new NotFoundException('Branch not found');

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      memberCount,
      pastorCount,
      recentMembers,
      departments,
      groups,
      events,
      outreaches,
      testimonies,
      attendanceSessions,
      attendanceTotal,
      newThisMonth,
    ] = await Promise.all([
      this.prisma.member.count({ where: { branchId: id } }),
      this.prisma.member.count({
        where: { branchId: id, pastoralRole: { not: 'NONE' } },
      }),
      this.prisma.member.findMany({
        where: { branchId: id },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          membershipNumber: true,
          status: true,
          pastoralRole: true,
          photoUrl: true,
        },
      }),
      this.prisma.department.findMany({
        where: { branchId: id },
        include: {
          leader: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
      }),
      this.prisma.group.findMany({
        where: { branchId: id },
        include: {
          leader: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { members: true } },
        },
        orderBy: { name: 'asc' },
        take: 10,
      }),
      this.prisma.event.findMany({
        where: { branchId: id },
        orderBy: { startAt: 'desc' },
        take: 8,
      }),
      this.prisma.outreach.findMany({
        where: { branchId: id },
        orderBy: { startAt: 'desc' },
        take: 8,
      }),
      this.prisma.testimony.findMany({
        where: { member: { branchId: id } },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { member: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.attendanceSession.findMany({
        where: { branchId: id },
        orderBy: { date: 'desc' },
        take: 8,
      }),
      this.prisma.attendanceSession.aggregate({
        where: { branchId: id },
        _sum: { totalCount: true },
        _count: true,
      }),
      this.prisma.member.count({
        where: { branchId: id, joinedAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      branch,
      stats: {
        members: memberCount,
        pastors: pastorCount,
        departments: departments.length,
        groups: groups.length,
        events: events.length,
        outreaches: outreaches.length,
        testimonies: testimonies.length,
        attendanceSessions: attendanceTotal._count,
        totalAttendance: attendanceTotal._sum.totalCount ?? 0,
        newThisMonth,
      },
      recentMembers,
      departments,
      groups,
      events,
      outreaches,
      testimonies,
      attendanceSessions,
    };
  }

  async create(dto: CreateBranchDto) {
    const churchId = await this.getChurchId();
    const exists = await this.prisma.branch.findUnique({
      where: { churchId_code: { churchId, code: dto.code } },
    });
    if (exists) throw new ConflictException('Branch code already exists');

    if (dto.isMain) {
      await this.prisma.branch.updateMany({ data: { isMain: false } });
    }

    return this.prisma.branch.create({
      data: { ...dto, churchId },
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    await this.findOne(id);
    const { branchPastorId, assistantPastorId, ...rest } = dto;

    if (branchPastorId) {
      const m = await this.prisma.member.findFirst({
        where: { id: branchPastorId, branchId: id },
      });
      if (!m) throw new BadRequestException('Branch pastor must be a member of this branch');
    }
    if (assistantPastorId) {
      const m = await this.prisma.member.findFirst({
        where: { id: assistantPastorId, branchId: id },
      });
      if (!m) throw new BadRequestException('Assistant pastor must be a member of this branch');
    }

    const data: Record<string, unknown> = { ...rest };
    if (branchPastorId !== undefined) data.branchPastorId = branchPastorId || null;
    if (assistantPastorId !== undefined) data.assistantPastorId = assistantPastorId || null;

    const branch = await this.prisma.branch.update({ where: { id }, data });

    if (branchPastorId) {
      await this.prisma.member.update({
        where: { id: branchPastorId },
        data: { pastoralRole: 'PASTOR' },
      });
    }
    if (assistantPastorId) {
      await this.prisma.member.update({
        where: { id: assistantPastorId },
        data: { pastoralRole: 'ASSISTANT_PASTOR' },
      });
    }

    return branch;
  }

  async remove(id: string) {
    const branch = await this.findOne(id);
    if (branch.isMain) throw new BadRequestException('Cannot delete the main branch');
    if (branch._count.members > 0 || branch._count.users > 0) {
      throw new BadRequestException('Branch still has members or users');
    }
    await this.prisma.branch.delete({ where: { id } });
    return { success: true };
  }
}
