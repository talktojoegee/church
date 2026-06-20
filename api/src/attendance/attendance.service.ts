import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/pagination';
import {
  AttendanceQueryDto,
  CreateSessionDto,
  UpdateSessionDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  private buildWhere(query: AttendanceQueryDto): Prisma.AttendanceSessionWhereInput {
    const where: Prisma.AttendanceSessionWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.type ? { type: query.type } : {}),
    };

    if (query.search?.trim()) {
      where.title = { contains: query.search.trim() };
    }

    if (query.dateFrom || query.dateTo) {
      where.date = {};
      if (query.dateFrom) {
        where.date.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        const end = new Date(query.dateTo);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    return where;
  }

  private computeTotal(dto: {
    totalCount?: number;
    maleCount?: number;
    femaleCount?: number;
    childrenCount?: number;
    presentMemberIds?: string[];
  }): number {
    if (dto.totalCount && dto.totalCount > 0) return dto.totalCount;
    const sum =
      (dto.maleCount ?? 0) + (dto.femaleCount ?? 0) + (dto.childrenCount ?? 0);
    if (sum > 0) return sum;
    return dto.presentMemberIds?.length ?? 0;
  }

  async findMany(query: AttendanceQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const where = this.buildWhere(query);

    const [rows, total] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        orderBy: { date: 'desc' },
        include: {
          branch: { select: { id: true, name: true } },
          _count: { select: { records: true } },
        },
        ...skipTake(page, pageSize),
      }),
      this.prisma.attendanceSession.count({ where }),
    ]);

    return paginate(rows, total, page, pageSize);
  }

  async findOne(id: string) {
    const session = await this.prisma.attendanceSession.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        records: {
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photoUrl: true,
                phone: true,
                membershipNumber: true,
              },
            },
          },
          orderBy: { member: { lastName: 'asc' } },
        },
      },
    });
    if (!session) throw new NotFoundException('Attendance session not found');
    return session;
  }

  async create(dto: CreateSessionDto, userId?: string) {
    const { presentMemberIds, date, ...rest } = dto;
    return this.prisma.attendanceSession.create({
      data: {
        ...rest,
        date: new Date(date),
        totalCount: this.computeTotal(dto),
        createdById: userId,
        records: presentMemberIds?.length
          ? { create: presentMemberIds.map((memberId) => ({ memberId, present: true })) }
          : undefined,
      },
      include: { _count: { select: { records: true } } },
    });
  }

  async update(id: string, dto: UpdateSessionDto) {
    const existing = await this.findOne(id);
    const { presentMemberIds, date, ...rest } = dto;

    if (presentMemberIds) {
      await this.prisma.attendanceRecord.deleteMany({ where: { sessionId: id } });
    }

    return this.prisma.attendanceSession.update({
      where: { id },
      data: {
        ...rest,
        ...(date ? { date: new Date(date) } : {}),
        totalCount: this.computeTotal({
          totalCount: dto.totalCount,
          maleCount: dto.maleCount ?? existing.maleCount,
          femaleCount: dto.femaleCount ?? existing.femaleCount,
          childrenCount: dto.childrenCount ?? existing.childrenCount,
          presentMemberIds,
        }),
        ...(presentMemberIds
          ? { records: { create: presentMemberIds.map((memberId) => ({ memberId, present: true })) } }
          : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.attendanceSession.delete({ where: { id } });
    return { success: true };
  }

  /** Aggregates for dashboards and filtered views. */
  async stats(query: AttendanceQueryDto = {}) {
    const where = this.buildWhere(query);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthWhere: Prisma.AttendanceSessionWhereInput = {
      ...where,
      date: {
        ...(typeof where.date === 'object' && where.date !== null ? where.date : {}),
        gte: startOfMonth,
      },
    };

    const [recent, monthAgg, byType, filteredTotal] = await Promise.all([
      this.prisma.attendanceSession.findMany({
        where,
        orderBy: { date: 'desc' },
        take: 12,
        select: {
          id: true,
          title: true,
          date: true,
          type: true,
          totalCount: true,
          maleCount: true,
          femaleCount: true,
          childrenCount: true,
          newcomerCount: true,
        },
      }),
      this.prisma.attendanceSession.aggregate({
        where: monthWhere,
        _avg: { totalCount: true },
        _max: { totalCount: true },
        _count: true,
      }),
      this.prisma.attendanceSession.groupBy({
        by: ['type'],
        where,
        _sum: { totalCount: true },
        _count: true,
      }),
      this.prisma.attendanceSession.aggregate({
        where,
        _sum: { totalCount: true },
        _count: true,
      }),
    ]);

    const lastSession = recent[0] ?? null;

    return {
      lastTotal: lastSession?.totalCount ?? 0,
      monthAverage: Math.round(monthAgg._avg.totalCount ?? 0),
      monthPeak: monthAgg._max.totalCount ?? 0,
      monthSessions: monthAgg._count,
      filteredSessions: filteredTotal._count,
      filteredTotal: filteredTotal._sum.totalCount ?? 0,
      trend: [...recent].reverse(),
      byType: byType
        .map((row) => ({
          type: row.type,
          sessions: row._count,
          totalAttendance: row._sum.totalCount ?? 0,
        }))
        .sort((a, b) => b.totalAttendance - a.totalAttendance),
    };
  }
}
