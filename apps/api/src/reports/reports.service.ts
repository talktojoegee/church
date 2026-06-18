import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from '../attendance/attendance.service';
import { MembersService } from '../members/members.service';
import { FinanceService } from '../finance/finance.service';

const num = (v: { toNumber?: () => number } | number | null | undefined): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && 'toNumber' in v && typeof v.toNumber === 'function') return v.toNumber();
  return Number(v);
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly attendance: AttendanceService,
    private readonly members: MembersService,
    private readonly finance: FinanceService,
  ) {}

  /** Cross-module dashboard snapshot. */
  async overview(branchId?: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const memberWhere = branchId ? { branchId } : {};
    const branchFilter = branchId ? { branchId } : {};

    const [
      memberStats,
      attendanceStats,
      financeSummary,
      userCount,
      employeeCount,
      openFollowUps,
      openFollowUpCampaigns,
      pendingTestimonies,
      upcomingEventsCount,
      recentContributions,
      recentCampaigns,
      upcomingEvents,
      recentMembers,
      monthlyFinance,
    ] = await Promise.all([
      this.members.stats(branchId),
      this.attendance.stats(branchId ? { branchId } : {}),
      this.finance.summary(branchId),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.employee.count({ where: { ...branchFilter, status: 'ACTIVE' } }),
      this.prisma.followUp.count({
        where: { ...branchFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.followUpCampaign.count({
        where: { ...branchFilter, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      }),
      this.prisma.testimony.count({ where: { status: 'PENDING' } }),
      this.prisma.event.count({
        where: { ...branchFilter, startAt: { gte: new Date() }, status: 'PUBLISHED' },
      }),
      this.prisma.contribution.findMany({
        where: branchId ? { branchId } : {},
        orderBy: { contributedAt: 'desc' },
        take: 5,
        include: {
          member: { select: { firstName: true, lastName: true } },
          fund: { select: { name: true } },
          givingType: { select: { name: true } },
        },
      }),
      this.prisma.followUpCampaign.findMany({
        where: branchFilter,
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          _count: { select: { recipients: true } },
          assignees: {
            take: 3,
            include: { user: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.event.findMany({
        where: { ...branchFilter, startAt: { gte: new Date() }, status: 'PUBLISHED' },
        orderBy: { startAt: 'asc' },
        take: 5,
        select: { id: true, title: true, startAt: true, location: true, _count: { select: { registrations: true } } },
      }),
      this.prisma.member.findMany({
        where: memberWhere,
        orderBy: { joinedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          status: true,
          joinedAt: true,
          photoUrl: true,
        },
      }),
      this.monthlyFinanceTrend(branchId),
    ]);

    return {
      members: {
        total: memberStats.total,
        newThisMonth: memberStats.newThisMonth,
        byStatus: memberStats.byStatus,
      },
      attendance: {
        lastTotal: attendanceStats.lastTotal,
        monthAverage: attendanceStats.monthAverage,
        monthPeak: attendanceStats.monthPeak,
        monthSessions: attendanceStats.monthSessions,
        trend: attendanceStats.trend,
      },
      finance: {
        totalIncome: financeSummary.totalIncome,
        totalExpense: financeSummary.totalExpense,
        netBalance: financeSummary.netBalance,
        monthIncome: financeSummary.monthIncome,
        monthExpense: financeSummary.monthExpense,
        byType: financeSummary.byType,
      },
      operations: {
        users: userCount,
        employees: employeeCount,
        openFollowUps: openFollowUps + openFollowUpCampaigns,
        openFollowUpCampaigns,
        pendingTestimonies,
        upcomingEvents: upcomingEventsCount,
      },
      recentContributions: recentContributions.map((c) => ({
        id: c.id,
        amount: num(c.amount),
        type: c.givingType?.name ?? 'Uncategorized',
        receivedAt: c.contributedAt,
        member: c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Anonymous',
        fund: c.fund?.name,
      })),
      recentCampaigns: recentCampaigns.map((c) => ({
        id: c.id,
        title: c.title,
        type: c.type,
        status: c.status,
        dueDate: c.dueDate,
        recipientCount: c._count.recipients,
        assignees: c.assignees.map((a) => `${a.user.firstName} ${a.user.lastName}`),
        createdAt: c.createdAt,
      })),
      upcomingEvents: upcomingEvents.map((e) => ({
        id: e.id,
        title: e.title,
        startAt: e.startAt,
        location: e.location,
        registrations: e._count.registrations,
      })),
      recentMembers: recentMembers.map((m) => ({
        id: m.id,
        name: `${m.firstName} ${m.lastName}`,
        status: m.status,
        joinedAt: m.joinedAt,
        photoUrl: m.photoUrl,
      })),
      monthlyFinance,
    };
  }

  private async monthlyFinanceTrend(branchId?: string) {
    const months: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const filter = branchId ? { branchId } : {};
      const [inc, exp] = await Promise.all([
        this.prisma.contribution.aggregate({
          where: { ...filter, contributedAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...filter, expenseDate: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);
      months.push({
        month: start.toLocaleDateString('en-NG', { month: 'short' }),
        income: num(inc._sum.amount),
        expense: num(exp._sum.amount),
      });
    }
    return months;
  }

  /** Membership growth by month (last 6 months). */
  async membershipGrowth(branchId?: string) {
    const months: { month: string; count: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const count = await this.prisma.member.count({
        where: {
          ...(branchId ? { branchId } : {}),
          joinedAt: { gte: start, lte: end },
        },
      });
      months.push({
        month: start.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }),
        count,
      });
    }
    return months;
  }

  /** Finance report for a date range. */
  financeReport(branchId?: string, from?: string, to?: string) {
    return this.finance.summary(branchId, from, to);
  }

  async exportMembersExcel(branchId?: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Members');
    ws.columns = [
      { header: 'Membership #', key: 'membershipNumber', width: 14 },
      { header: 'First Name', key: 'firstName', width: 16 },
      { header: 'Last Name', key: 'lastName', width: 16 },
      { header: 'Phone', key: 'phone', width: 16 },
      { header: 'Email', key: 'email', width: 24 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Joined', key: 'joinedAt', width: 14 },
      { header: 'Branch', key: 'branch', width: 16 },
    ];
    ws.getRow(1).font = { bold: true };

    const rows = await this.prisma.member.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { lastName: 'asc' },
      include: { branch: { select: { name: true } } },
    });
    for (const m of rows) {
      ws.addRow({
        membershipNumber: m.membershipNumber,
        firstName: m.firstName,
        lastName: m.lastName,
        phone: m.phone,
        email: m.email,
        status: m.status,
        gender: m.gender,
        joinedAt: m.joinedAt?.toISOString().slice(0, 10),
        branch: m.branch.name,
      });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async exportContributionsExcel(branchId?: string, from?: string, to?: string): Promise<Buffer> {
    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Income');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Member', key: 'member', width: 22 },
      { header: 'Type', key: 'type', width: 14 },
      { header: 'Amount (NGN)', key: 'amount', width: 16 },
      { header: 'Fund', key: 'fund', width: 16 },
      { header: 'Method', key: 'method', width: 12 },
      { header: 'Receipt #', key: 'receipt', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(`${to}T23:59:59`);

    const rows = await this.prisma.contribution.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(Object.keys(dateFilter).length ? { contributedAt: dateFilter } : {}),
      },
      orderBy: { contributedAt: 'desc' },
      include: {
        member: { select: { firstName: true, lastName: true } },
        fund: { select: { name: true } },
        givingType: { select: { name: true } },
      },
    });
    for (const c of rows) {
      ws.addRow({
        date: c.contributedAt.toISOString().slice(0, 10),
        member: c.member ? `${c.member.firstName} ${c.member.lastName}` : 'Anonymous',
        type: c.givingType?.name ?? '',
        amount: num(c.amount),
        fund: c.fund?.name ?? '',
        method: c.paymentMethod,
        receipt: c.receiptNumber ?? '',
      });
    }
    return Buffer.from(await wb.xlsx.writeBuffer());
  }
}
