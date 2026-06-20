import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReportQueryDto, ReportType } from './dto/report-query.dto';
import { buildExcelBuffer, buildExcelWithSummary, ExcelColumn } from './excel.util';

const num = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : Number(v);

const fmtDate = (d: Date | null | undefined) =>
  d ? d.toISOString().slice(0, 10) : '';

const fmtDateTime = (d: Date | null | undefined) =>
  d ? d.toISOString().replace('T', ' ').slice(0, 16) : '';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportDataResult {
  type: ReportType;
  title: string;
  total: number;
  page: number;
  pageSize: number;
  summary: Record<string, number | string>;
  columns: ReportColumn[];
  rows: Record<string, string | number | null>[];
}

type ReportHandler = {
  title: string;
  columns: ReportColumn[];
  fetch: (q: ReportQueryDto, paginate: boolean) => Promise<{
    rows: Record<string, string | number | null>[];
    total: number;
    summary: Record<string, number | string>;
  }>;
};

@Injectable()
export class ReportsDataService {
  constructor(private readonly prisma: PrismaService) {}

  private branchWhere(branchId?: string) {
    return branchId ? { branchId } : {};
  }

  private dateWhere(
    from?: string,
    to?: string,
    field = 'createdAt',
  ): Record<string, unknown> {
    if (!from && !to) return {};
    const range: { gte?: Date; lte?: Date } = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(`${to}T23:59:59.999`);
    return { [field]: range };
  }

  private handlers(): Record<ReportType, ReportHandler> {
    return {
      members: {
        title: 'Members',
        columns: [
          { key: 'membershipNumber', label: 'Membership #' },
          { key: 'name', label: 'Name' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Status' },
          { key: 'gender', label: 'Gender' },
          { key: 'joinedAt', label: 'Joined' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'joinedAt'),
          };
          const [rows, total, active] = await Promise.all([
            this.prisma.member.findMany({
              where,
              orderBy: { lastName: 'asc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: { branch: { select: { name: true } } },
            }),
            this.prisma.member.count({ where }),
            this.prisma.member.count({ where: { ...where, status: 'MEMBER' } }),
          ]);
          return {
            total,
            summary: { total, activeMembers: active },
            rows: rows.map((m) => ({
              membershipNumber: m.membershipNumber ?? '',
              name: `${m.firstName} ${m.lastName}`,
              phone: m.phone ?? '',
              email: m.email ?? '',
              status: m.status,
              gender: m.gender ?? '',
              joinedAt: fmtDate(m.joinedAt),
              branch: m.branch.name,
            })),
          };
        },
      },

      groups: {
        title: 'Groups',
        columns: [
          { key: 'name', label: 'Group' },
          { key: 'category', label: 'Category' },
          { key: 'leader', label: 'Leader' },
          { key: 'members', label: 'Members' },
          { key: 'meetingDay', label: 'Meeting day' },
          { key: 'location', label: 'Location' },
          { key: 'active', label: 'Active' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = { ...this.branchWhere(q.branchId) };
          const [rows, total] = await Promise.all([
            this.prisma.group.findMany({
              where,
              orderBy: { name: 'asc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                leader: { select: { firstName: true, lastName: true } },
                _count: { select: { members: true } },
              },
            }),
            this.prisma.group.count({ where }),
          ]);
          const active = await this.prisma.group.count({
            where: { ...where, isActive: true },
          });
          return {
            total,
            summary: { total, activeGroups: active },
            rows: rows.map((g) => ({
              name: g.name,
              category: g.category ?? '',
              leader: g.leader ? `${g.leader.firstName} ${g.leader.lastName}` : '',
              members: g._count.members,
              meetingDay: g.meetingDay ?? '',
              location: g.location ?? '',
              active: g.isActive ? 'Yes' : 'No',
              branch: g.branch.name,
            })),
          };
        },
      },

      'follow-ups': {
        title: 'Follow-ups',
        columns: [
          { key: 'contact', label: 'Contact' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'dueDate', label: 'Due date' },
          { key: 'completedAt', label: 'Completed' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'createdAt'),
          };
          const [rows, total, open] = await Promise.all([
            this.prisma.followUp.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                member: { select: { firstName: true, lastName: true } },
              },
            }),
            this.prisma.followUp.count({ where }),
            this.prisma.followUp.count({
              where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS'] } },
            }),
          ]);
          return {
            total,
            summary: { total, open },
            rows: rows.map((f) => ({
              contact: f.member
                ? `${f.member.firstName} ${f.member.lastName}`
                : (f.contactName ?? f.contactPhone ?? 'Unknown'),
              type: f.type,
              status: f.status,
              dueDate: fmtDate(f.dueDate),
              completedAt: fmtDate(f.completedAt),
              branch: f.branch.name,
            })),
          };
        },
      },

      attendance: {
        title: 'Attendance',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'title', label: 'Service' },
          { key: 'type', label: 'Type' },
          { key: 'total', label: 'Total' },
          { key: 'male', label: 'Male' },
          { key: 'female', label: 'Female' },
          { key: 'children', label: 'Children' },
          { key: 'newcomers', label: 'Newcomers' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...this.dateWhere(q.from, q.to, 'date'),
          };
          const [rows, total, agg] = await Promise.all([
            this.prisma.attendanceSession.findMany({
              where,
              orderBy: { date: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: { branch: { select: { name: true } } },
            }),
            this.prisma.attendanceSession.count({ where }),
            this.prisma.attendanceSession.aggregate({
              where,
              _sum: { totalCount: true },
              _avg: { totalCount: true },
            }),
          ]);
          return {
            total,
            summary: {
              sessions: total,
              totalAttendance: agg._sum.totalCount ?? 0,
              average: Math.round(agg._avg.totalCount ?? 0),
            },
            rows: rows.map((s) => ({
              date: fmtDate(s.date),
              title: s.title,
              type: s.type,
              total: s.totalCount,
              male: s.maleCount,
              female: s.femaleCount,
              children: s.childrenCount,
              newcomers: s.newcomerCount,
              branch: s.branch.name,
            })),
          };
        },
      },

      events: {
        title: 'Events',
        columns: [
          { key: 'title', label: 'Event' },
          { key: 'startAt', label: 'Starts' },
          { key: 'location', label: 'Location' },
          { key: 'status', label: 'Status' },
          { key: 'registrations', label: 'Registrations' },
          { key: 'capacity', label: 'Capacity' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'startAt'),
          };
          const [rows, total] = await Promise.all([
            this.prisma.event.findMany({
              where,
              orderBy: { startAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                _count: { select: { registrations: true } },
              },
            }),
            this.prisma.event.count({ where }),
          ]);
          const upcoming = await this.prisma.event.count({
            where: {
              ...where,
              startAt: { gte: new Date() },
              status: 'PUBLISHED',
            },
          });
          return {
            total,
            summary: { total, upcoming },
            rows: rows.map((e) => ({
              title: e.title,
              startAt: fmtDateTime(e.startAt),
              location: e.location ?? '',
              status: e.status,
              registrations: e._count.registrations,
              capacity: e.capacity ?? '',
              branch: e.branch.name,
            })),
          };
        },
      },

      outreaches: {
        title: 'Outreaches',
        columns: [
          { key: 'title', label: 'Outreach' },
          { key: 'type', label: 'Type' },
          { key: 'status', label: 'Status' },
          { key: 'startAt', label: 'Start' },
          { key: 'location', label: 'Location' },
          { key: 'peopleReached', label: 'People reached' },
          { key: 'souls', label: 'Souls' },
          { key: 'budget', label: 'Budget (NGN)' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'startAt'),
          };
          const [rows, total, souls] = await Promise.all([
            this.prisma.outreach.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                type: { select: { name: true } },
              },
            }),
            this.prisma.outreach.count({ where }),
            this.prisma.outreach.aggregate({ where, _sum: { souls: true } }),
          ]);
          return {
            total,
            summary: { total, totalSouls: souls._sum.souls ?? 0 },
            rows: rows.map((o) => ({
              title: o.title,
              type: o.type?.name ?? '',
              status: o.status,
              startAt: fmtDate(o.startAt),
              location: o.location ?? o.state ?? '',
              peopleReached: o.peopleReached ?? '',
              souls: o.souls ?? '',
              budget: o.budget != null ? num(o.budget) : '',
              branch: o.branch.name,
            })),
          };
        },
      },

      contributions: {
        title: 'Income',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'source', label: 'Source' },
          { key: 'member', label: 'Member / employee' },
          { key: 'type', label: 'Giving type' },
          { key: 'amount', label: 'Amount (NGN)' },
          { key: 'payRun', label: 'Pay run' },
          { key: 'description', label: 'Description' },
          { key: 'fund', label: 'Fund' },
          { key: 'method', label: 'Method' },
          { key: 'receipt', label: 'Receipt #' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...this.dateWhere(q.from, q.to, 'contributedAt'),
          };
          const [rows, total, agg] = await Promise.all([
            this.prisma.contribution.findMany({
              where,
              orderBy: { contributedAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                member: { select: { firstName: true, lastName: true } },
                fund: { select: { name: true } },
                givingType: { select: { name: true } },
                payslip: {
                  select: {
                    payRun: { select: { title: true, period: true } },
                    employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
                  },
                },
              },
            }),
            this.prisma.contribution.count({ where }),
            this.prisma.contribution.aggregate({ where, _sum: { amount: true } }),
          ]);
          return {
            total,
            summary: { records: total, totalAmount: num(agg._sum.amount) },
            rows: rows.map((c) => ({
              date: fmtDate(c.contributedAt),
              source: c.payslipId ? 'Payroll repayment' : 'Manual',
              member: c.payslip?.employee
                ? `${c.payslip.employee.firstName} ${c.payslip.employee.lastName} (${c.payslip.employee.employeeNumber})`
                : c.member
                  ? `${c.member.firstName} ${c.member.lastName}`
                  : 'Anonymous',
              type: c.givingType?.name ?? '',
              amount: num(c.amount),
              payRun: c.payslip?.payRun ? `${c.payslip.payRun.title} (${c.payslip.payRun.period})` : '',
              description: c.payrollDeduction ?? c.note ?? '',
              fund: c.fund?.name ?? '',
              method: c.paymentMethod,
              receipt: c.receiptNumber ?? '',
              branch: c.branch.name,
            })),
          };
        },
      },

      expenses: {
        title: 'Expenses',
        columns: [
          { key: 'date', label: 'Date' },
          { key: 'category', label: 'Category' },
          { key: 'amount', label: 'Amount (NGN)' },
          { key: 'employee', label: 'Employee' },
          { key: 'payRun', label: 'Pay run' },
          { key: 'description', label: 'Description' },
          { key: 'paidTo', label: 'Paid to' },
          { key: 'fund', label: 'Fund' },
          { key: 'method', label: 'Method' },
          { key: 'reference', label: 'Reference' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...this.dateWhere(q.from, q.to, 'expenseDate'),
          };
          const [rows, total, agg] = await Promise.all([
            this.prisma.expense.findMany({
              where,
              orderBy: { expenseDate: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                fund: { select: { name: true } },
                category: { select: { name: true } },
                payslip: {
                  select: {
                    payRun: { select: { title: true, period: true } },
                    employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
                  },
                },
              },
            }),
            this.prisma.expense.count({ where }),
            this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
          ]);
          return {
            total,
            summary: { records: total, totalAmount: num(agg._sum.amount) },
            rows: rows.map((e) => ({
              date: fmtDate(e.expenseDate),
              category: e.category?.name ?? '',
              amount: num(e.amount),
              employee: e.payslip?.employee
                ? `${e.payslip.employee.firstName} ${e.payslip.employee.lastName} (${e.payslip.employee.employeeNumber})`
                : '',
              payRun: e.payslip?.payRun ? `${e.payslip.payRun.title} (${e.payslip.payRun.period})` : '',
              description: e.description ?? '',
              paidTo: e.paidTo ?? '',
              fund: e.fund?.name ?? '',
              method: e.paymentMethod,
              reference: e.reference ?? '',
              branch: e.branch.name,
            })),
          };
        },
      },

      pledges: {
        title: 'Pledges',
        columns: [
          { key: 'campaign', label: 'Campaign' },
          { key: 'member', label: 'Member' },
          { key: 'amount', label: 'Pledged (NGN)' },
          { key: 'fulfilled', label: 'Fulfilled (NGN)' },
          { key: 'balance', label: 'Balance (NGN)' },
          { key: 'status', label: 'Status' },
          { key: 'dueDate', label: 'Due date' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'createdAt'),
          };
          const [rows, total, agg] = await Promise.all([
            this.prisma.pledge.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                member: { select: { firstName: true, lastName: true } },
              },
            }),
            this.prisma.pledge.count({ where }),
            this.prisma.pledge.aggregate({
              where,
              _sum: { amount: true, fulfilledAmount: true },
            }),
          ]);
          return {
            total,
            summary: {
              records: total,
              pledged: num(agg._sum.amount),
              fulfilled: num(agg._sum.fulfilledAmount),
            },
            rows: rows.map((p) => ({
              campaign: p.campaign,
              member: p.member ? `${p.member.firstName} ${p.member.lastName}` : '',
              amount: num(p.amount),
              fulfilled: num(p.fulfilledAmount),
              balance: num(p.amount) - num(p.fulfilledAmount),
              status: p.status,
              dueDate: fmtDate(p.dueDate),
              branch: p.branch.name,
            })),
          };
        },
      },

      employees: {
        title: 'Employees',
        columns: [
          { key: 'employeeNumber', label: 'Employee #' },
          { key: 'name', label: 'Name' },
          { key: 'position', label: 'Position' },
          { key: 'department', label: 'Department' },
          { key: 'type', label: 'Employment' },
          { key: 'status', label: 'Status' },
          { key: 'baseSalary', label: 'Base salary (NGN)' },
          { key: 'hireDate', label: 'Hire date' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
          };
          const [rows, total, active] = await Promise.all([
            this.prisma.employee.findMany({
              where,
              orderBy: { lastName: 'asc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: { branch: { select: { name: true } } },
            }),
            this.prisma.employee.count({ where }),
            this.prisma.employee.count({ where: { ...where, status: 'ACTIVE' } }),
          ]);
          return {
            total,
            summary: { total, active },
            rows: rows.map((e) => ({
              employeeNumber: e.employeeNumber,
              name: `${e.firstName} ${e.lastName}`,
              position: e.position ?? '',
              department: e.department ?? '',
              type: e.employmentType,
              status: e.status,
              baseSalary: num(e.baseSalary),
              hireDate: fmtDate(e.hireDate),
              branch: e.branch.name,
            })),
          };
        },
      },

      leave: {
        title: 'Leave requests',
        columns: [
          { key: 'employee', label: 'Employee' },
          { key: 'type', label: 'Leave type' },
          { key: 'startDate', label: 'Start' },
          { key: 'endDate', label: 'End' },
          { key: 'days', label: 'Days' },
          { key: 'status', label: 'Status' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'startDate'),
            ...(q.branchId
              ? { employee: { branchId: q.branchId } }
              : {}),
          };
          const [rows, total, pending] = await Promise.all([
            this.prisma.leaveRequest.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                employee: {
                  select: {
                    firstName: true,
                    lastName: true,
                    branch: { select: { name: true } },
                  },
                },
              },
            }),
            this.prisma.leaveRequest.count({ where }),
            this.prisma.leaveRequest.count({ where: { ...where, status: 'PENDING' } }),
          ]);
          return {
            total,
            summary: { total, pending },
            rows: rows.map((l) => ({
              employee: `${l.employee.firstName} ${l.employee.lastName}`,
              type: l.type,
              startDate: fmtDate(l.startDate),
              endDate: fmtDate(l.endDate),
              days: l.days,
              status: l.status,
              branch: l.employee.branch.name,
            })),
          };
        },
      },

      payroll: {
        title: 'Payroll runs',
        columns: [
          { key: 'title', label: 'Pay run' },
          { key: 'period', label: 'Period' },
          { key: 'status', label: 'Status' },
          { key: 'runDate', label: 'Run date' },
          { key: 'payslips', label: 'Payslips' },
          { key: 'totalNet', label: 'Total net (NGN)' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'runDate'),
          };
          const [rows, total, netAgg] = await Promise.all([
            this.prisma.payRun.findMany({
              where,
              orderBy: { runDate: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: {
                branch: { select: { name: true } },
                payslips: { select: { netPay: true } },
              },
            }),
            this.prisma.payRun.count({ where }),
            this.prisma.payslip.aggregate({
              where: { payRun: where },
              _sum: { netPay: true },
            }),
          ]);
          return {
            total,
            summary: {
              payRuns: total,
              totalNet: num(netAgg._sum.netPay),
            },
            rows: rows.map((r) => ({
              title: r.title,
              period: r.period,
              status: r.status,
              runDate: fmtDate(r.runDate),
              payslips: r.payslips.length,
              totalNet: r.payslips.reduce((s, p) => s + num(p.netPay), 0),
              branch: r.branch.name,
            })),
          };
        },
      },

      'bulk-sms': {
        title: 'Bulk SMS',
        columns: [
          { key: 'sentAt', label: 'Sent at' },
          { key: 'senderId', label: 'Sender ID' },
          { key: 'message', label: 'Message' },
          { key: 'recipients', label: 'Recipients' },
          { key: 'pages', label: 'Pages' },
          { key: 'cost', label: 'Cost (NGN)' },
          { key: 'status', label: 'Status' },
          { key: 'branch', label: 'Branch' },
        ],
        fetch: async (q, paginate) => {
          const where = {
            ...this.branchWhere(q.branchId),
            ...(q.status ? { status: q.status as never } : {}),
            ...this.dateWhere(q.from, q.to, 'createdAt'),
          };
          const [rows, total, agg] = await Promise.all([
            this.prisma.bulkSmsMessage.findMany({
              where,
              orderBy: { createdAt: 'desc' },
              ...(paginate
                ? { skip: ((q.page ?? 1) - 1) * (q.pageSize ?? 50), take: q.pageSize ?? 50 }
                : {}),
              include: { branch: { select: { name: true } } },
            }),
            this.prisma.bulkSmsMessage.count({ where }),
            this.prisma.bulkSmsMessage.aggregate({
              where,
              _sum: { cost: true, recipientCount: true },
            }),
          ]);
          return {
            total,
            summary: {
              messages: total,
              totalCost: num(agg._sum.cost),
              totalRecipients: agg._sum.recipientCount ?? 0,
            },
            rows: rows.map((m) => ({
              sentAt: fmtDateTime(m.sentAt ?? m.createdAt),
              senderId: m.senderIdLabel,
              message: m.message.length > 80 ? `${m.message.slice(0, 80)}…` : m.message,
              recipients: m.recipientCount,
              pages: m.pages,
              cost: num(m.cost),
              status: m.status,
              branch: m.branch?.name ?? '',
            })),
          };
        },
      },
    };
  }

  async getReportData(query: ReportQueryDto): Promise<ReportDataResult> {
    const handler = this.handlers()[query.type];
    if (!handler) throw new BadRequestException('Unknown report type');

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const { rows, total, summary } = await handler.fetch(
      { ...query, page, pageSize },
      true,
    );

    return {
      type: query.type,
      title: handler.title,
      total,
      page,
      pageSize,
      summary,
      columns: handler.columns,
      rows,
    };
  }

  async exportReportExcel(query: ReportQueryDto): Promise<{ buffer: Buffer; filename: string }> {
    const handler = this.handlers()[query.type];
    if (!handler) throw new BadRequestException('Unknown report type');

    const { rows } = await handler.fetch(query, false);
    const excelCols: ExcelColumn[] = handler.columns.map((c) => ({
      header: c.label,
      key: c.key,
      width: ['message', 'description'].includes(c.key) ? 36 : c.key === 'payRun' ? 24 : 16,
    }));

    let buffer: Buffer;
    if (query.type === 'expenses') {
      const summaryMap = new Map<string, { category: string; records: number; total: number }>();
      for (const row of rows) {
        const key = String(row.category || 'Uncategorised');
        const cur = summaryMap.get(key) ?? { category: key, records: 0, total: 0 };
        cur.records += 1;
        cur.total += Number(row.amount) || 0;
        summaryMap.set(key, cur);
      }
      buffer = await buildExcelWithSummary(
        'Detail',
        'Summary by category',
        excelCols,
        rows,
        [
          { header: 'Category', key: 'category', width: 24 },
          { header: 'Records', key: 'records', width: 12 },
          { header: 'Total (NGN)', key: 'total', width: 18 },
        ],
        [...summaryMap.values()].sort((a, b) => b.total - a.total),
      );
    } else if (query.type === 'contributions') {
      const summaryMap = new Map<string, { type: string; source: string; records: number; total: number }>();
      for (const row of rows) {
        const key = `${row.type}|${row.source}`;
        const cur = summaryMap.get(key) ?? {
          type: String(row.type || 'Uncategorised'),
          source: String(row.source || ''),
          records: 0,
          total: 0,
        };
        cur.records += 1;
        cur.total += Number(row.amount) || 0;
        summaryMap.set(key, cur);
      }
      buffer = await buildExcelWithSummary(
        'Detail',
        'Summary by type',
        excelCols,
        rows,
        [
          { header: 'Giving type', key: 'type', width: 24 },
          { header: 'Source', key: 'source', width: 20 },
          { header: 'Records', key: 'records', width: 12 },
          { header: 'Total (NGN)', key: 'total', width: 18 },
        ],
        [...summaryMap.values()].sort((a, b) => b.total - a.total),
      );
    } else {
      buffer = await buildExcelBuffer(handler.title, excelCols, rows);
    }

    const date = new Date().toISOString().slice(0, 10);
    return { buffer, filename: `${query.type}-report-${date}.xlsx` };
  }
}
