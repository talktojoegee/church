import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LeaveStatus, Prisma, SalaryComponent } from '@prisma/client';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { FinanceService } from '../finance/finance.service';
import {
  CreateEmployeeDto,
  CreateLeaveDto,
  CreatePayRunDto,
  CreatePeriodAdjustmentDto,
  EmployeeQueryDto,
  LeaveQueryDto,
  PayRunQueryDto,
  PeriodAdjustmentQueryDto,
  ReviewLeaveDto,
  SalaryComponentDto,
  UpdateEmployeeDto,
  UpdatePayRunDto,
} from './dto/hr.dto';

const num = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : Number(v);

function parseLocalDate(value: string | Date): Date {
  if (typeof value === 'string') {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function countWorkingDays(start: string | Date, end: string | Date): number {
  if (!start || !end) return 0;
  const startDate = parseLocalDate(start);
  const endDate = parseLocalDate(end);
  if (endDate < startDate) return 0;

  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count++;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

const employeeUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  roles: { select: { role: { select: { name: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class HrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  // ---------------- Employees ----------------
  private async generateEmployeeNumber(): Promise<string> {
    const count = await this.prisma.employee.count();
    return `EMP-${String(count + 1).padStart(4, '0')}`;
  }

  private shapeLinkedUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    avatarUrl: string | null;
    isActive: boolean;
    roles: { role: { name: string } }[];
  } | null) {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      isActive: user.isActive,
      roles: user.roles.map((r) => r.role.name),
    };
  }

  private async assertUserLink(userId: string | null | undefined, employeeId?: string) {
    if (!userId) return;
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('Linked user not found');
    const existing = await this.prisma.employee.findUnique({ where: { userId } });
    if (existing && existing.id !== employeeId) {
      throw new BadRequestException('This user is already linked to another employee');
    }
  }

  private async resolveUserPrefill(userId?: string | null) {
    if (!userId) return null;
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, email: true, phone: true, branchId: true },
    });
  }

  async listEmployees(query: EmployeeQueryDto = {}) {
    const rows = await this.prisma.employee.findMany({
      where: this.employeeWhere(query),
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: employeeUserSelect },
        _count: { select: { leaves: true } },
      },
    });
    return rows.map((row) => ({
      ...row,
      user: this.shapeLinkedUser(row.user),
    }));
  }

  async getEmployee(id: string) {
    const emp = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: employeeUserSelect },
        components: true,
        leaves: { orderBy: { startDate: 'desc' } },
        payslips: {
          orderBy: { createdAt: 'desc' },
          include: {
            payRun: {
              select: { id: true, title: true, period: true, status: true, runDate: true },
            },
          },
        },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');
    return {
      ...emp,
      user: this.shapeLinkedUser(emp.user),
      computed: this.computePay(emp.baseSalary, emp.components),
      payslips: emp.payslips.map((p) => ({
        ...p,
        baseSalary: num(p.baseSalary),
        totalAllowances: num(p.totalAllowances),
        totalDeductions: num(p.totalDeductions),
        grossPay: num(p.grossPay),
        netPay: num(p.netPay),
      })),
    };
  }

  async createEmployee(dto: CreateEmployeeDto) {
    const { hireDate, userId, ...rest } = dto;
    await this.assertUserLink(userId ?? null);
    const linkedUser = await this.resolveUserPrefill(userId);
    const created = await this.prisma.employee.create({
      data: {
        ...rest,
        userId: userId || null,
        firstName: rest.firstName || linkedUser?.firstName || rest.firstName,
        lastName: rest.lastName || linkedUser?.lastName || rest.lastName,
        email: rest.email ?? linkedUser?.email,
        phone: rest.phone ?? linkedUser?.phone ?? undefined,
        branchId: rest.branchId || linkedUser?.branchId || rest.branchId,
        employeeNumber: await this.generateEmployeeNumber(),
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
      },
    });
    return this.getEmployee(created.id);
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    await this.getEmployee(id);
    const { hireDate, endDate, userId, ...rest } = dto;
    if (userId !== undefined) {
      await this.assertUserLink(userId || null, id);
    }
    await this.prisma.employee.update({
      where: { id },
      data: {
        ...rest,
        ...(userId !== undefined ? { userId: userId || null } : {}),
        ...(hireDate ? { hireDate: new Date(hireDate) } : {}),
        ...(endDate ? { endDate: new Date(endDate) } : {}),
      },
    });
    return this.getEmployee(id);
  }

  async removeEmployee(id: string) {
    await this.getEmployee(id);
    await this.prisma.employee.delete({ where: { id } });
    return { success: true };
  }

  async setComponents(id: string, components: SalaryComponentDto[]) {
    await this.getEmployee(id);
    await this.prisma.salaryComponent.deleteMany({ where: { employeeId: id } });
    if (components.length) {
      await this.prisma.salaryComponent.createMany({
        data: components.map((c) => ({
          employeeId: id,
          name: c.name,
          type: c.type,
          amount: c.amount,
          isPercentage: c.isPercentage ?? false,
          givingTypeId: c.type === 'DEDUCTION' ? c.givingTypeId ?? null : null,
        })),
      });
    }
    return this.getEmployee(id);
  }

  /** Compute allowances, deductions, gross and net for a base + components. */
  private computePay(
    baseSalary: Prisma.Decimal | number,
    components: { type: string; amount: Prisma.Decimal | number; isPercentage: boolean }[],
  ) {
    const base = num(baseSalary);
    let allowances = 0;
    let deductions = 0;
    for (const c of components) {
      const value = c.isPercentage ? (base * num(c.amount)) / 100 : num(c.amount);
      if (c.type === 'ALLOWANCE') allowances += value;
      else deductions += value;
    }
    const gross = base + allowances;
    const net = gross - deductions;
    return {
      baseSalary: base,
      totalAllowances: allowances,
      totalDeductions: deductions,
      grossPay: gross,
      netPay: net,
    };
  }

  private buildPayslipFromEmployee(
    employee: { baseSalary: Prisma.Decimal | number; components: SalaryComponent[] },
    periodAdjustments: {
      name: string;
      type: string;
      amount: Prisma.Decimal | number;
      givingTypeId?: string | null;
    }[],
  ) {
    type ComponentRow = {
      name: string;
      type: string;
      amount: Prisma.Decimal | number;
      isPercentage: boolean;
      source: 'salary' | 'period';
      givingTypeId?: string | null;
    };

    const merged: ComponentRow[] = [
      ...employee.components.map((c) => ({
        name: c.name,
        type: c.type,
        amount: c.amount,
        isPercentage: c.isPercentage ?? false,
        source: 'salary' as const,
        givingTypeId: c.type === 'DEDUCTION' ? c.givingTypeId : null,
      })),
      ...periodAdjustments.map((a) => ({
        name: a.name,
        type: a.type,
        amount: a.amount,
        isPercentage: false,
        source: 'period' as const,
        givingTypeId: a.type === 'DEDUCTION' ? a.givingTypeId ?? null : null,
      })),
    ];

    const pay = this.computePay(
      employee.baseSalary,
      merged.map((c) => ({ type: c.type, amount: c.amount, isPercentage: c.isPercentage })),
    );

    return {
      ...pay,
      breakdown: merged.map((c) => ({
        name: c.name,
        type: c.type,
        amount: num(c.amount),
        isPercentage: c.isPercentage,
        source: c.source,
        ...(c.givingTypeId ? { givingTypeId: c.givingTypeId } : {}),
      })),
    };
  }

  async listPeriodAdjustments(query: PeriodAdjustmentQueryDto) {
    const rows = await this.prisma.payrollPeriodAdjustment.findMany({
      where: { branchId: query.branchId, period: query.period },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
        payRun: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => ({ ...r, amount: num(r.amount) }));
  }

  async createPeriodAdjustment(dto: CreatePeriodAdjustmentDto) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: dto.employeeId, branchId: dto.branchId, status: { not: 'TERMINATED' } },
    });
    if (!employee) throw new BadRequestException('Employee not found in this branch');
    if (dto.type !== 'DEDUCTION' && dto.givingTypeId) {
      throw new BadRequestException('Income type applies to deductions only');
    }

    const row = await this.prisma.payrollPeriodAdjustment.create({
      data: {
        ...dto,
        givingTypeId: dto.type === 'DEDUCTION' ? dto.givingTypeId ?? null : null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, employeeNumber: true },
        },
      },
    });
    return { ...row, amount: num(row.amount) };
  }

  async removePeriodAdjustment(id: string) {
    const row = await this.prisma.payrollPeriodAdjustment.findUnique({
      where: { id },
      include: { payRun: { select: { status: true } } },
    });
    if (!row) throw new NotFoundException('Period adjustment not found');
    if (row.payRunId && row.payRun?.status !== 'DRAFT') {
      throw new BadRequestException('Cannot remove an adjustment applied to a finalized pay run');
    }

    const payRunId = row.payRunId;
    await this.prisma.payrollPeriodAdjustment.delete({ where: { id } });

    if (payRunId) await this.recalculatePayRun(payRunId);
    return { success: true };
  }

  private async payslipCreatesForRun(
    branchId: string,
    period: string,
    employeeIds?: string[],
    payRunId?: string,
  ) {
    const employees = await this.prisma.employee.findMany({
      where: {
        branchId,
        status: { not: 'TERMINATED' },
        ...(employeeIds?.length ? { id: { in: employeeIds } } : {}),
      },
      include: { components: true },
    });

    if (employees.length === 0) {
      throw new BadRequestException('No eligible employees for this pay run');
    }

    const adjustments = await this.prisma.payrollPeriodAdjustment.findMany({
      where: {
        branchId,
        period,
        OR: [{ payRunId: null }, ...(payRunId ? [{ payRunId }] : [])],
      },
    });

    const byEmployee = new Map<string, typeof adjustments>();
    for (const adj of adjustments) {
      const list = byEmployee.get(adj.employeeId) ?? [];
      list.push(adj);
      byEmployee.set(adj.employeeId, list);
    }

    return {
      employees,
      adjustments,
      creates: employees.map((e) => {
        const pay = this.buildPayslipFromEmployee(e, byEmployee.get(e.id) ?? []);
        return {
          employeeId: e.id,
          baseSalary: pay.baseSalary,
          totalAllowances: pay.totalAllowances,
          totalDeductions: pay.totalDeductions,
          grossPay: pay.grossPay,
          netPay: pay.netPay,
          breakdown: pay.breakdown,
        };
      }),
    };
  }

  // ---------------- Leave ----------------
  private leaveWhere(query: LeaveQueryDto): Prisma.LeaveRequestWhereInput {
    const { branchId, employeeId, status, type, search, from, to } = query;
    const dateRange =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          }
        : undefined;

    return {
      ...(employeeId ? { employeeId } : {}),
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
      ...(dateRange ? { startDate: dateRange } : {}),
      ...(branchId || search
        ? {
            employee: {
              ...(branchId ? { branchId } : {}),
              ...(search
                ? {
                    OR: [
                      { firstName: { contains: search } },
                      { lastName: { contains: search } },
                      { employeeNumber: { contains: search } },
                      { position: { contains: search } },
                    ],
                  }
                : {}),
            },
          }
        : {}),
    };
  }

  async listLeave(query: LeaveQueryDto = {}) {
    return this.prisma.leaveRequest.findMany({
      where: this.leaveWhere(query),
      orderBy: { createdAt: 'desc' },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, position: true, employeeNumber: true },
        },
      },
    });
  }

  async leaveStats(query: LeaveQueryDto = {}) {
    const where = this.leaveWhere(query);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, pending, approved, rejected, daysAgg, monthCount] = await Promise.all([
      this.prisma.leaveRequest.count({ where }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.leaveRequest.count({ where: { ...where, status: 'REJECTED' } }),
      this.prisma.leaveRequest.aggregate({ where, _sum: { days: true } }),
      this.prisma.leaveRequest.count({
        where: { ...where, createdAt: { gte: startOfMonth } },
      }),
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      totalDays: daysAgg._sum.days ?? 0,
      thisMonth: monthCount,
    };
  }

  async createLeave(dto: CreateLeaveDto) {
    const startDate = parseLocalDate(dto.startDate);
    const endDate = parseLocalDate(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('End date must be on or after start date');
    }
    const days = countWorkingDays(dto.startDate, dto.endDate);
    if (days < 1) {
      throw new BadRequestException('Leave must include at least one weekday');
    }

    return this.prisma.leaveRequest.create({
      data: {
        employeeId: dto.employeeId,
        type: dto.type,
        startDate,
        endDate,
        days,
        reason: dto.reason,
      },
    });
  }

  async reviewLeave(id: string, dto: ReviewLeaveDto, reviewerId?: string) {
    const leave = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leave) throw new NotFoundException('Leave request not found');

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: dto.status, reviewNote: dto.reviewNote, reviewedById: reviewerId },
    });

    // Reflect leave status on the employee for approved/active leave.
    if (dto.status === 'APPROVED') {
      await this.prisma.employee.update({
        where: { id: leave.employeeId },
        data: { status: 'ON_LEAVE' },
      });
    }
    return updated;
  }

  async removeLeave(id: string) {
    await this.prisma.leaveRequest.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Payroll ----------------
  private payRunWhere(query: PayRunQueryDto): Prisma.PayRunWhereInput {
    const { branchId, status, period, search, from, to } = query;
    const dateRange =
      from || to
        ? {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
          }
        : undefined;

    return {
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(period ? { period } : {}),
      ...(dateRange ? { runDate: dateRange } : {}),
      ...(search
        ? {
            OR: [{ title: { contains: search } }, { period: { contains: search } }, { notes: { contains: search } }],
          }
        : {}),
    };
  }

  async listPayRuns(query: PayRunQueryDto = {}) {
    return this.prisma.payRun.findMany({
      where: this.payRunWhere(query),
      orderBy: { runDate: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { payslips: true } },
        payslips: { select: { netPay: true, grossPay: true } },
      },
    });
  }

  async payrollStats(query: PayRunQueryDto = {}) {
    const where = this.payRunWhere(query);

    const [total, draft, processed, paid, runs] = await Promise.all([
      this.prisma.payRun.count({ where }),
      this.prisma.payRun.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.payRun.count({ where: { ...where, status: 'PROCESSED' } }),
      this.prisma.payRun.count({ where: { ...where, status: 'PAID' } }),
      this.prisma.payRun.findMany({
        where,
        select: {
          _count: { select: { payslips: true } },
          payslips: { select: { netPay: true } },
        },
      }),
    ]);

    let totalPayslips = 0;
    let totalNet = 0;
    for (const run of runs) {
      totalPayslips += run._count.payslips;
      totalNet += run.payslips.reduce((s, p) => s + num(p.netPay), 0);
    }

    return {
      total,
      draft,
      processed,
      paid,
      totalPayslips,
      totalNet,
    };
  }

  async getPayRun(id: string) {
    const run = await this.prisma.payRun.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                position: true,
                department: true,
                email: true,
                phone: true,
                employmentType: true,
                hireDate: true,
                bankName: true,
                bankAccountNo: true,
                bankAccountName: true,
                branch: { select: { name: true } },
              },
            },
            expense: {
              select: { id: true, amount: true, expenseDate: true, description: true },
            },
            contributions: {
              select: {
                id: true,
                amount: true,
                payrollDeduction: true,
                givingType: { select: { name: true } },
              },
            },
          },
          orderBy: { employee: { firstName: 'asc' } },
        },
      },
    });
    if (!run) throw new NotFoundException('Pay run not found');
    return run;
  }

  async createPayRun(dto: CreatePayRunDto, userId?: string) {
    const { adjustments, creates } = await this.payslipCreatesForRun(
      dto.branchId,
      dto.period,
      dto.employeeIds,
    );

    const run = await this.prisma.$transaction(async (tx) => {
      const created = await tx.payRun.create({
        data: {
          branchId: dto.branchId,
          title: dto.title,
          period: dto.period,
          notes: dto.notes,
          createdById: userId,
          payslips: { create: creates },
        },
        include: { _count: { select: { payslips: true } } },
      });

      if (adjustments.length > 0) {
        await tx.payrollPeriodAdjustment.updateMany({
          where: {
            id: { in: adjustments.map((a) => a.id) },
          },
          data: { payRunId: created.id },
        });
      }

      return created;
    });

    return run;
  }

  async recalculatePayRun(id: string) {
    const run = await this.getPayRun(id);
    if (run.status !== 'DRAFT') {
      throw new BadRequestException('Only draft pay runs can be recalculated');
    }

    const { creates, adjustments } = await this.payslipCreatesForRun(
      run.branchId,
      run.period,
      run.payslips.map((p) => p.employeeId),
      id,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.payrollPeriodAdjustment.updateMany({
        where: { payRunId: id },
        data: { payRunId: null },
      });
      await tx.payslip.deleteMany({ where: { payRunId: id } });
      await tx.payslip.createMany({
        data: creates.map((c) => ({ ...c, payRunId: id })),
      });
      if (adjustments.length > 0) {
        await tx.payrollPeriodAdjustment.updateMany({
          where: { id: { in: adjustments.map((a) => a.id) } },
          data: { payRunId: id },
        });
      }
    });

    return this.getPayRun(id);
  }

  async updatePayRun(id: string, dto: UpdatePayRunDto, userId?: string) {
    const run = await this.getPayRun(id);

    if (dto.status === 'PAID' && run.status !== 'PAID') {
      const updated = await this.prisma.$transaction(async (tx) => {
        const next = await tx.payRun.update({ where: { id }, data: dto });
        await this.createPayRunFinanceRecords(tx, next.id, userId);
        return next;
      });
      return this.getPayRun(updated.id);
    }

    return this.prisma.payRun.update({ where: { id }, data: dto });
  }

  private async resolveSalariesCategoryId(
    tx: PrismaTransactionClient,
    branchId: string,
  ): Promise<string> {
    const existing = await tx.expenseCategory.findFirst({
      where: { branchId, name: 'Salaries' },
    });
    if (existing) return existing.id;

    const created = await tx.expenseCategory.create({
      data: { branchId, name: 'Salaries', description: 'Staff payroll' },
    });
    return created.id;
  }

  private async resolveRepaymentGivingTypeId(
    tx: PrismaTransactionClient,
    branchId: string,
  ): Promise<string> {
    const existing = await tx.givingType.findFirst({
      where: { branchId, name: 'Repayment' },
    });
    if (existing) return existing.id;

    const created = await tx.givingType.create({
      data: { branchId, name: 'Repayment', description: 'Payroll deductions and loan repayments' },
    });
    return created.id;
  }

  private async generateReceiptNumber(tx: PrismaTransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.contribution.count();
    return `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private deductionAmount(
    baseSalary: Prisma.Decimal | number,
    line: { amount: number; isPercentage?: boolean },
  ): number {
    return line.isPercentage ? (num(baseSalary) * line.amount) / 100 : line.amount;
  }

  private async createPayRunFinanceRecords(
    tx: PrismaTransactionClient,
    payRunId: string,
    userId?: string,
  ) {
    const run = await tx.payRun.findUnique({
      where: { id: payRunId },
      include: {
        payslips: {
          include: {
            employee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                employeeNumber: true,
                memberId: true,
              },
            },
            contributions: { select: { id: true, payrollDeduction: true, givingTypeId: true } },
          },
        },
      },
    });
    if (!run) throw new NotFoundException('Pay run not found');

    const categoryId = await this.resolveSalariesCategoryId(tx, run.branchId);
    const repaymentTypeId = await this.resolveRepaymentGivingTypeId(tx, run.branchId);
    const defaultFundId = await this.finance.resolveFundId(run.branchId, undefined, tx);
    const financeDate = new Date();

    for (const slip of run.payslips) {
      const empName = `${slip.employee.firstName} ${slip.employee.lastName}`;
      const base = num(slip.baseSalary);
      const allowances = num(slip.totalAllowances);
      const grossPay = num(slip.grossPay);

      if (!slip.expenseId && grossPay > 0) {
        const expense = await tx.expense.create({
          data: {
            branchId: run.branchId,
            fundId: defaultFundId,
            categoryId,
            amount: grossPay,
            expenseDate: financeDate,
            paymentMethod: 'TRANSFER',
            paidTo: empName,
            reference: slip.id,
            description: `Salary — ${empName} (${slip.employee.employeeNumber}) · Base ${base.toLocaleString()} + Allowances ${allowances.toLocaleString()} · ${run.title} (${run.period})`,
            recordedById: userId,
          },
        });
        await tx.payslip.update({ where: { id: slip.id }, data: { expenseId: expense.id } });
      }

      const breakdown = (slip.breakdown ?? []) as {
        name: string;
        type: string;
        amount: number;
        isPercentage?: boolean;
      }[];

      for (const line of breakdown) {
        if (line.type !== 'DEDUCTION') continue;

        const amount = this.deductionAmount(slip.baseSalary, line);
        if (amount <= 0) continue;

        const alreadyRecorded = slip.contributions.some(
          (c) => c.payrollDeduction === line.name && c.givingTypeId === repaymentTypeId,
        );
        if (alreadyRecorded) continue;

        await tx.contribution.create({
          data: {
            branchId: run.branchId,
            fundId: defaultFundId,
            givingTypeId: repaymentTypeId,
            memberId: slip.employee.memberId ?? undefined,
            amount,
            contributedAt: financeDate,
            paymentMethod: 'TRANSFER',
            reference: run.id,
            receiptNumber: await this.generateReceiptNumber(tx),
            note: `Payroll repayment: ${line.name} — ${run.title} (${run.period})`,
            payslipId: slip.id,
            payrollDeduction: line.name,
            recordedById: userId,
          },
        });
      }
    }
  }

  async removePayRun(id: string) {
    await this.getPayRun(id);
    await this.prisma.payRun.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Export ----------------
  async exportPayrollLogExcel(employeeId: string): Promise<Buffer> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        branch: { select: { name: true } },
        payslips: {
          orderBy: { createdAt: 'desc' },
          include: {
            payRun: { select: { title: true, period: true, status: true, runDate: true } },
          },
        },
      },
    });
    if (!emp) throw new NotFoundException('Employee not found');

    const ExcelJS = await import('exceljs');
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Payroll Log');

    ws.mergeCells('A1:H1');
    ws.getCell('A1').value = `${emp.firstName} ${emp.lastName} — Payroll Log`;
    ws.getCell('A1').font = { bold: true, size: 14 };

    ws.mergeCells('A2:H2');
    ws.getCell('A2').value = `Employee ID: ${emp.employeeNumber} · Branch: ${emp.branch.name} · Exported: ${new Date().toISOString().slice(0, 10)}`;
    ws.getCell('A2').font = { color: { argb: 'FF64748B' }, size: 10 };

    const headerRow = 4;
    ws.getRow(headerRow).values = [
      'Period',
      'Pay run',
      'Run date',
      'Status',
      'Component',
      'Type',
      'Amount (NGN)',
      'Notes',
    ];
    ws.getRow(headerRow).font = { bold: true };
    ws.getRow(headerRow).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2E8F0' },
    };

    ws.columns = [
      { width: 12 },
      { width: 24 },
      { width: 14 },
      { width: 12 },
      { width: 22 },
      { width: 14 },
      { width: 16 },
      { width: 28 },
    ];

    type BreakdownItem = {
      name: string;
      type: string;
      amount: number;
      isPercentage: boolean;
    };

    let rowNum = headerRow + 1;

    for (const slip of emp.payslips) {
      const base = num(slip.baseSalary);
      const gross = num(slip.grossPay);
      const net = num(slip.netPay);
      const allowances = num(slip.totalAllowances);
      const deductions = num(slip.totalDeductions);
      const runDate = slip.payRun.runDate.toISOString().slice(0, 10);

      const summaryRow = ws.getRow(rowNum);
      summaryRow.values = [
        slip.payRun.period,
        slip.payRun.title,
        runDate,
        slip.payRun.status,
        'PAYSLIP SUMMARY',
        '',
        net,
        `Gross: ${gross.toLocaleString('en-NG')} · Allowances: ${allowances.toLocaleString('en-NG')} · Deductions: ${deductions.toLocaleString('en-NG')}`,
      ];
      summaryRow.font = { bold: true };
      summaryRow.outlineLevel = 1;
      rowNum++;

      const details: { name: string; type: string; amount: number; note: string }[] = [
        { name: 'Base salary', type: 'BASE', amount: base, note: '' },
      ];

      const breakdown = (slip.breakdown as BreakdownItem[] | null) ?? [];
      for (const item of breakdown) {
        const value = item.isPercentage ? (base * num(item.amount)) / 100 : num(item.amount);
        details.push({
          name: item.name,
          type: item.type,
          amount: value,
          note: item.isPercentage ? `${num(item.amount)}% of base` : '',
        });
      }

      if (allowances > 0 && !breakdown.some((b) => b.type === 'ALLOWANCE')) {
        details.push({ name: 'Total allowances', type: 'ALLOWANCE', amount: allowances, note: '' });
      }
      if (deductions > 0 && !breakdown.some((b) => b.type === 'DEDUCTION')) {
        details.push({ name: 'Total deductions', type: 'DEDUCTION', amount: deductions, note: '' });
      }

      for (const d of details) {
        const detailRow = ws.getRow(rowNum);
        detailRow.values = ['', '', '', '', d.name, d.type, d.amount, d.note];
        detailRow.outlineLevel = 2;
        if (d.type === 'ALLOWANCE') {
          detailRow.getCell(7).font = { color: { argb: 'FF059669' } };
        } else if (d.type === 'DEDUCTION') {
          detailRow.getCell(7).font = { color: { argb: 'FFE11D48' } };
        }
        rowNum++;
      }
    }

    if (emp.payslips.length === 0) {
      ws.getRow(rowNum).values = ['No payslips recorded yet.', '', '', '', '', '', '', ''];
    }

    ws.properties.outlineLevelRow = 2;
    ws.properties.outlineProperties = { summaryBelow: false, summaryRight: false };

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  // ---------------- Stats ----------------
  private employeeWhere(query: EmployeeQueryDto): Prisma.EmployeeWhereInput {
    const { branchId, search, status, employmentType } = query;
    return {
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(employmentType ? { employmentType } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { employeeNumber: { contains: search } },
              { position: { contains: search } },
              { department: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {}),
    };
  }

  async stats(query: EmployeeQueryDto = {}) {
    const where = this.employeeWhere(query);
    const [total, active, onLeave, pendingLeave, payrollAgg] = await Promise.all([
      this.prisma.employee.count({ where }),
      this.prisma.employee.count({ where: { ...where, status: 'ACTIVE' } }),
      this.prisma.employee.count({ where: { ...where, status: 'ON_LEAVE' } }),
      this.prisma.leaveRequest.count({
        where: {
          status: 'PENDING',
          ...(query.branchId ? { employee: { branchId: query.branchId } } : {}),
        },
      }),
      this.prisma.employee.aggregate({ where, _sum: { baseSalary: true } }),
    ]);
    return {
      totalEmployees: total,
      active,
      onLeave,
      pendingLeave,
      monthlyBaseTotal: num(payrollAgg._sum.baseSalary),
    };
  }
}
