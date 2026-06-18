import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, PaymentMethod } from '@prisma/client';
import { PrismaService, PrismaTransactionClient } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/pagination';
import {
  CreateContributionDto,
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  CreateFundDto,
  CreateGivingTypeDto,
  CreatePledgeDto,
  CommitStatementImportDto,
  FinanceQueryDto,
  UpdateContributionDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
  UpdateFundDto,
  UpdateGivingTypeDto,
  UpdatePledgeDto,
} from './dto/finance.dto';
import {
  parseStatementBuffer,
  suggestExpenseCategoryName,
  suggestGivingTypeName,
} from './statement.parser';

const num = (v: Prisma.Decimal | null | undefined): number => (v ? Number(v) : 0);

const memberSel = { select: { id: true, firstName: true, lastName: true } };
const fundSel = { select: { id: true, name: true, currency: true, bankName: true, accountNumber: true } };
const branchSel = { select: { id: true, name: true } };
const givingTypeSel = { select: { id: true, name: true } };
const categorySel = { select: { id: true, name: true } };
const payslipSel = {
  select: {
    payRun: { select: { title: true, period: true } },
    employee: { select: { firstName: true, lastName: true, employeeNumber: true } },
  },
};
const pledgeSel = { select: { id: true, campaign: true } };

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  private dateRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
    if (!from && !to) return undefined;
    return {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}),
    };
  }

  // ---------------- Funds ----------------
  async listFunds(branchId?: string, from?: string, to?: string) {
    const funds = await this.prisma.fund.findMany({
      where: branchId ? { branchId } : {},
      orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      include: { branch: branchSel },
    });

    const range = this.dateRange(from, to);
    const fundDateWhere = range ? { contributedAt: range } : {};
    const expenseDateWhere = range ? { expenseDate: range } : {};

    const [income, spent, allTimeIncome, allTimeSpent] = await Promise.all([
      this.prisma.contribution.groupBy({
        by: ['fundId'],
        where: { fundId: { not: null }, ...(branchId ? { branchId } : {}), ...fundDateWhere },
        _sum: { amount: true },
      }),
      this.prisma.expense.groupBy({
        by: ['fundId'],
        where: { fundId: { not: null }, ...(branchId ? { branchId } : {}), ...expenseDateWhere },
        _sum: { amount: true },
      }),
      range
        ? this.prisma.contribution.groupBy({
            by: ['fundId'],
            where: { fundId: { not: null }, ...(branchId ? { branchId } : {}) },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
      range
        ? this.prisma.expense.groupBy({
            by: ['fundId'],
            where: { fundId: { not: null }, ...(branchId ? { branchId } : {}) },
            _sum: { amount: true },
          })
        : Promise.resolve(null),
    ]);

    const incMap = new Map(income.map((i) => [i.fundId, num(i._sum.amount)]));
    const expMap = new Map(spent.map((e) => [e.fundId, num(e._sum.amount)]));
    const allIncMap = allTimeIncome
      ? new Map(allTimeIncome.map((i) => [i.fundId, num(i._sum.amount)]))
      : incMap;
    const allExpMap = allTimeSpent
      ? new Map(allTimeSpent.map((e) => [e.fundId, num(e._sum.amount)]))
      : expMap;

    return funds.map((f) => {
      const totalIn = incMap.get(f.id) ?? 0;
      const totalOut = expMap.get(f.id) ?? 0;
      const opening = num(f.openingBalance);
      const balance = range
        ? opening + (allIncMap.get(f.id) ?? 0) - (allExpMap.get(f.id) ?? 0)
        : opening + totalIn - totalOut;
      return {
        ...f,
        openingBalance: opening,
        totalIn,
        totalOut,
        balance,
        dateFiltered: Boolean(range),
      };
    });
  }

  async resolveDefaultFundId(
    branchId: string,
    tx?: PrismaTransactionClient,
  ): Promise<string | undefined> {
    const db = tx ?? this.prisma;
    const fund = await db.fund.findFirst({
      where: { branchId, isDefault: true, isActive: true },
      select: { id: true },
    });
    return fund?.id;
  }

  async resolveFundId(
    branchId: string,
    fundId?: string | null,
    tx?: PrismaTransactionClient,
  ): Promise<string | undefined> {
    if (fundId) return fundId;
    return this.resolveDefaultFundId(branchId, tx);
  }

  private async applyDefaultFundFlag(
    tx: PrismaTransactionClient,
    branchId: string,
    fundId: string,
    isDefault: boolean,
  ) {
    if (!isDefault) return;
    await tx.fund.updateMany({
      where: { branchId, id: { not: fundId } },
      data: { isDefault: false },
    });
    await tx.fund.update({ where: { id: fundId }, data: { isDefault: true } });
  }

  createFund(dto: CreateFundDto) {
    const { openingBalanceDate, openingBalance, isDefault, ...rest } = dto;
    return this.prisma.$transaction(async (tx) => {
      const existingCount = await tx.fund.count({ where: { branchId: dto.branchId } });
      const shouldDefault = isDefault ?? existingCount === 0;

      const fund = await tx.fund.create({
        data: {
          ...rest,
          isDefault: shouldDefault,
          openingBalance: openingBalance ?? 0,
          openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : undefined,
        },
      });

      if (shouldDefault) {
        await this.applyDefaultFundFlag(tx, dto.branchId, fund.id, true);
      }

      return fund;
    });
  }

  async updateFund(id: string, dto: UpdateFundDto) {
    const current = await this.getFund(id);
    const { openingBalanceDate, isDefault, ...rest } = dto;

    return this.prisma.$transaction(async (tx) => {
      const fund = await tx.fund.update({
        where: { id },
        data: {
          ...rest,
          ...(openingBalanceDate !== undefined
            ? { openingBalanceDate: openingBalanceDate ? new Date(openingBalanceDate) : null }
            : {}),
        },
      });

      if (isDefault === true) {
        await this.applyDefaultFundFlag(tx, current.branchId, id, true);
      } else if (isDefault === false && current.isDefault) {
        const other = await tx.fund.findFirst({
          where: { branchId: current.branchId, id: { not: id }, isActive: true },
          orderBy: { createdAt: 'asc' },
        });
        await tx.fund.update({ where: { id }, data: { isDefault: false } });
        if (other) {
          await tx.fund.update({ where: { id: other.id }, data: { isDefault: true } });
        }
      }

      return fund;
    });
  }
  async removeFund(id: string) {
    await this.getFund(id);
    const [contributionCount, expenseCount] = await Promise.all([
      this.prisma.contribution.count({ where: { fundId: id } }),
      this.prisma.expense.count({ where: { fundId: id } }),
    ]);
    if (contributionCount + expenseCount > 0) {
      throw new ForbiddenException(
        'This account has income or expense records and cannot be deleted',
      );
    }
    await this.prisma.fund.delete({ where: { id } });
    return { success: true };
  }
  private async getFund(id: string) {
    const fund = await this.prisma.fund.findUnique({ where: { id } });
    if (!fund) throw new NotFoundException('Fund not found');
    return fund;
  }

  // ---------------- Giving types ----------------
  listGivingTypes(branchId?: string) {
    return this.prisma.givingType.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      include: { _count: { select: { contributions: true } } },
    });
  }
  createGivingType(dto: CreateGivingTypeDto) {
    return this.prisma.givingType.create({ data: dto });
  }
  async updateGivingType(id: string, dto: UpdateGivingTypeDto) {
    await this.getGivingType(id);
    return this.prisma.givingType.update({ where: { id }, data: dto });
  }
  async removeGivingType(id: string) {
    await this.getGivingType(id);
    await this.prisma.givingType.delete({ where: { id } });
    return { success: true };
  }
  private async getGivingType(id: string) {
    const row = await this.prisma.givingType.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Giving type not found');
    return row;
  }

  // ---------------- Expense categories ----------------
  listExpenseCategories(branchId?: string) {
    return this.prisma.expenseCategory.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } },
    });
  }
  createExpenseCategory(dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({ data: dto });
  }
  async updateExpenseCategory(id: string, dto: UpdateExpenseCategoryDto) {
    await this.getExpenseCategory(id);
    return this.prisma.expenseCategory.update({ where: { id }, data: dto });
  }
  async removeExpenseCategory(id: string) {
    await this.getExpenseCategory(id);
    await this.prisma.expenseCategory.delete({ where: { id } });
    return { success: true };
  }
  private async getExpenseCategory(id: string) {
    const row = await this.prisma.expenseCategory.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Expense category not found');
    return row;
  }

  // ---------------- Contributions ----------------
  private async generateReceiptNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.contribution.count();
    return `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async generateReceiptNumberTx(tx: PrismaTransactionClient): Promise<string> {
    const year = new Date().getFullYear();
    const count = await tx.contribution.count();
    return `RCP-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  private async resolvePledgeGivingTypeId(
    tx: PrismaTransactionClient,
    branchId: string,
  ): Promise<string> {
    const existing = await tx.givingType.findFirst({
      where: { branchId, name: 'Pledge' },
    });
    if (existing) return existing.id;

    const created = await tx.givingType.create({
      data: { branchId, name: 'Pledge', description: 'Pledge and campaign giving' },
    });
    return created.id;
  }

  private async createPledgeIncome(
    tx: PrismaTransactionClient,
    params: {
      pledgeId: string;
      branchId: string;
      memberId?: string | null;
      campaign: string;
      amount: number;
      fundId?: string;
      paymentMethod?: string;
      userId?: string;
    },
  ) {
    if (params.amount <= 0) return;

    const givingTypeId = await this.resolvePledgeGivingTypeId(tx, params.branchId);
    const fundId = await this.resolveFundId(params.branchId, params.fundId, tx);
    await tx.contribution.create({
      data: {
        branchId: params.branchId,
        memberId: params.memberId ?? undefined,
        givingTypeId,
        pledgeId: params.pledgeId,
        fundId,
        amount: params.amount,
        contributedAt: new Date(),
        paymentMethod: (params.paymentMethod as PaymentMethod) ?? 'CASH',
        note: `Pledge: ${params.campaign}`,
        receiptNumber: await this.generateReceiptNumberTx(tx),
        recordedById: params.userId,
      },
    });
  }

  async listContributions(query: FinanceQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const where = this.contributionWhere(query);

    const [rows, total, sum] = await Promise.all([
      this.prisma.contribution.findMany({
        where,
        orderBy: { contributedAt: 'desc' },
        include: { member: memberSel, fund: fundSel, branch: branchSel, givingType: givingTypeSel, payslip: payslipSel, pledge: pledgeSel },
        ...skipTake(page, pageSize),
      }),
      this.prisma.contribution.count({ where }),
      this.prisma.contribution.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { ...paginate(rows, total, page, pageSize), totalAmount: num(sum._sum.amount) };
  }

  async createContribution(dto: CreateContributionDto, userId?: string) {
    const { contributedAt, fundId, ...rest } = dto;
    const resolvedFundId = await this.resolveFundId(dto.branchId, fundId);
    const created = await this.prisma.contribution.create({
      data: {
        ...rest,
        fundId: resolvedFundId,
        contributedAt: new Date(contributedAt),
        receiptNumber: await this.generateReceiptNumber(),
        recordedById: userId,
      },
      include: { member: memberSel, fund: fundSel, givingType: givingTypeSel, payslip: payslipSel, pledge: pledgeSel },
    });
    return created;
  }

  async updateContribution(id: string, dto: UpdateContributionDto, userId?: string) {
    const existing = await this.getContribution(id);
    const { contributedAt, ...rest } = dto;
    const updated = await this.prisma.contribution.update({
      where: { id },
      data: { ...rest, ...(contributedAt ? { contributedAt: new Date(contributedAt) } : {}) },
      include: { member: memberSel, fund: fundSel, givingType: givingTypeSel, payslip: payslipSel, pledge: pledgeSel },
    });

    return updated;
  }
  async removeContribution(id: string) {
    await this.getContribution(id);
    throw new ForbiddenException('Financial records cannot be deleted');
  }
  private async getContribution(id: string) {
    const c = await this.prisma.contribution.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Contribution not found');
    return c;
  }

  async generateReceiptPdf(id: string): Promise<Buffer> {
    const c = await this.prisma.contribution.findUnique({
      where: { id },
      include: {
        member: memberSel,
        fund: fundSel,
        givingType: givingTypeSel,
        branch: {
          include: {
            church: {
              select: { name: true, address: true, phone: true, email: true, currency: true },
            },
          },
        },
      },
    });
    if (!c) throw new NotFoundException('Contribution not found');

    const PDFDocument = (await import('pdfkit')).default;
    const church = c.branch.church;
    const currency = church.currency ?? 'NGN';
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(n);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(church.name, { align: 'center' });
      doc.fontSize(10).fillColor('#555').text(c.branch.name, { align: 'center' });
      if (church.address) doc.text(church.address, { align: 'center' });
      doc.moveDown();
      doc.fillColor('#000').fontSize(16).text('OFFICIAL RECEIPT', { align: 'center', underline: true });
      doc.moveDown(1.5);

      doc.fontSize(11);
      doc.text(`Receipt No: ${c.receiptNumber ?? '—'}`);
      doc.text(`Date: ${c.contributedAt.toLocaleDateString('en-NG', { dateStyle: 'long' })}`);
      doc.text(`Type: ${c.givingType?.name ?? '—'}`);
      doc.text(`Payment method: ${c.paymentMethod.replace(/_/g, ' ')}`);
      if (c.member) {
        doc.text(`Received from: ${c.member.firstName} ${c.member.lastName}`);
      } else if (c.donorName) {
        doc.text(`Received from: ${c.donorName}`);
      }
      if (c.donorEmail) doc.text(`Email: ${c.donorEmail}`);
      if (c.fund) doc.text(`Fund: ${c.fund.name}`);
      if (c.reference) doc.text(`Reference: ${c.reference}`);
      doc.moveDown();
      doc.fontSize(14).text(`Amount: ${fmt(num(c.amount))}`, { align: 'right' });
      if (c.note) {
        doc.moveDown();
        doc.fontSize(10).text(`Note: ${c.note}`);
      }
      doc.moveDown(3);
      doc.fontSize(9).fillColor('#888').text('Thank you for your generous giving.', { align: 'center' });

      doc.end();
    });
  }

  async generateExpenseVoucherPdf(id: string): Promise<Buffer> {
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        fund: fundSel,
        category: categorySel,
        branch: {
          include: {
            church: {
              select: { name: true, address: true, phone: true, email: true, currency: true },
            },
          },
        },
        payslip: payslipSel,
      },
    });
    if (!e) throw new NotFoundException('Expense not found');

    const PDFDocument = (await import('pdfkit')).default;
    const church = e.branch.church;
    const currency = church.currency ?? 'NGN';
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(n);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(20).text(church.name, { align: 'center' });
      doc.fontSize(10).fillColor('#555').text(e.branch.name, { align: 'center' });
      if (church.address) doc.text(church.address, { align: 'center' });
      doc.moveDown();
      doc.fillColor('#000').fontSize(16).text('EXPENSE VOUCHER', { align: 'center', underline: true });
      doc.moveDown(1.5);

      doc.fontSize(11);
      doc.text(`Voucher ref: ${e.id.slice(-8).toUpperCase()}`);
      doc.text(`Date: ${e.expenseDate.toLocaleDateString('en-NG', { dateStyle: 'long' })}`);
      doc.text(`Category: ${e.category?.name ?? '—'}`);
      doc.text(`Payment method: ${e.paymentMethod.replace(/_/g, ' ')}`);
      if (e.paidTo) doc.text(`Paid to: ${e.paidTo}`);
      if (e.fund) doc.text(`Account: ${e.fund.name}`);
      if (e.reference) doc.text(`Reference: ${e.reference}`);
      if (e.payslip?.employee) {
        doc.text(
          `Employee: ${e.payslip.employee.firstName} ${e.payslip.employee.lastName} (${e.payslip.employee.employeeNumber})`,
        );
      }
      if (e.description) doc.text(`Description: ${e.description}`);
      doc.moveDown();
      doc.fontSize(14).text(`Amount: ${fmt(num(e.amount))}`, { align: 'right' });
      doc.moveDown(3);
      doc.fontSize(9).fillColor('#888').text('Internal expense record.', { align: 'center' });

      doc.end();
    });
  }

  // ---------------- Expenses ----------------
  async listExpenses(query: FinanceQueryDto) {
    const { page = 1, pageSize = 20 } = query;
    const where = this.expenseWhere(query);

    const [rows, total, sum] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        include: { fund: fundSel, branch: branchSel, category: categorySel, payslip: payslipSel },
        ...skipTake(page, pageSize),
      }),
      this.prisma.expense.count({ where }),
      this.prisma.expense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return { ...paginate(rows, total, page, pageSize), totalAmount: num(sum._sum.amount) };
  }

  async createExpense(dto: CreateExpenseDto, userId?: string) {
    const { expenseDate, fundId, ...rest } = dto;
    const resolvedFundId = await this.resolveFundId(dto.branchId, fundId);
    const created = await this.prisma.expense.create({
      data: {
        ...rest,
        fundId: resolvedFundId,
        expenseDate: new Date(expenseDate),
        recordedById: userId,
      },
      include: { fund: fundSel, category: categorySel, payslip: payslipSel },
    });
    return created;
  }
  async updateExpense(id: string, dto: UpdateExpenseDto, userId?: string) {
    const existing = await this.getExpense(id);
    const { expenseDate, ...rest } = dto;
    const updated = await this.prisma.expense.update({
      where: { id },
      data: { ...rest, ...(expenseDate ? { expenseDate: new Date(expenseDate) } : {}) },
      include: { fund: fundSel, category: categorySel, payslip: payslipSel },
    });

    return updated;
  }
  async removeExpense(id: string) {
    await this.getExpense(id);
    throw new ForbiddenException('Financial records cannot be deleted');
  }
  private async getExpense(id: string) {
    const e = await this.prisma.expense.findUnique({ where: { id } });
    if (!e) throw new NotFoundException('Expense not found');
    return e;
  }

  // ---------------- Pledges ----------------
  async listPledges(branchId?: string) {
    const pledges = await this.prisma.pledge.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      include: { member: memberSel, branch: branchSel },
    });
    return pledges.map((p) => ({
      ...p,
      amount: num(p.amount),
      fulfilledAmount: num(p.fulfilledAmount),
      outstanding: num(p.amount) - num(p.fulfilledAmount),
    }));
  }

  createPledge(dto: CreatePledgeDto, userId?: string) {
    const { dueDate, amountReceived, paymentMethod, fundId, ...rest } = dto;
    const received = amountReceived ?? 0;
    if (received > dto.amount) {
      throw new ForbiddenException('Amount received cannot exceed the pledged amount');
    }

    return this.prisma.$transaction(async (tx) => {
      const pledge = await tx.pledge.create({
        data: {
          ...rest,
          fulfilledAmount: received,
          status: received >= dto.amount ? 'FULFILLED' : 'ACTIVE',
          ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
        },
      });

      await this.createPledgeIncome(tx, {
        pledgeId: pledge.id,
        branchId: pledge.branchId,
        memberId: pledge.memberId,
        campaign: pledge.campaign,
        amount: received,
        fundId,
        paymentMethod,
        userId,
      });

      return pledge;
    });
  }

  async updatePledge(id: string, dto: UpdatePledgeDto, userId?: string) {
    let paymentDelta = 0;
    let campaign = '';

    const updated = await this.prisma.$transaction(async (tx) => {
      const pledge = await tx.pledge.findUnique({ where: { id } });
      if (!pledge) throw new NotFoundException('Pledge not found');

      const { dueDate, paymentMethod, fundId, ...rest } = dto;
      const prevFulfilled = num(pledge.fulfilledAmount);
      const newFulfilled = dto.fulfilledAmount ?? prevFulfilled;
      paymentDelta = newFulfilled - prevFulfilled;
      campaign = pledge.campaign;

      if (paymentDelta < 0) {
        throw new ForbiddenException('Pledge payments cannot be reduced');
      }

      const pledgedTotal = dto.amount ?? num(pledge.amount);
      if (newFulfilled > pledgedTotal) {
        throw new ForbiddenException('Fulfilled amount cannot exceed the pledged amount');
      }

      const data: Prisma.PledgeUpdateInput = {
        ...rest,
        ...(dueDate !== undefined ? { dueDate: dueDate ? new Date(dueDate) : null } : {}),
      };

      if (dto.fulfilledAmount !== undefined) {
        data.fulfilledAmount = newFulfilled;
        if (newFulfilled >= pledgedTotal && !dto.status) data.status = 'FULFILLED';
      }

      const result = await tx.pledge.update({ where: { id }, data });

      if (paymentDelta > 0) {
        await this.createPledgeIncome(tx, {
          pledgeId: pledge.id,
          branchId: pledge.branchId,
          memberId: pledge.memberId,
          campaign: pledge.campaign,
          amount: paymentDelta,
          fundId,
          paymentMethod,
          userId,
        });
      }

      return result;
    });

    return updated;
  }
  async removePledge(id: string) {
    const pledge = await this.prisma.pledge.findUnique({ where: { id } });
    if (!pledge) throw new NotFoundException('Pledge not found');
    throw new ForbiddenException('Financial records cannot be deleted');
  }

  // ---------------- Reports / Summary ----------------
  async summary(branchId?: string, from?: string, to?: string) {
    const range = this.dateRange(from, to);
    const cWhere: Prisma.ContributionWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(range ? { contributedAt: range } : {}),
    };
    const eWhere: Prisma.ExpenseWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(range ? { expenseDate: range } : {}),
    };

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const monthPromises = Array.from({ length: 6 }, (_, idx) => {
      const i = 5 - idx;
      const start = new Date();
      start.setDate(1);
      start.setMonth(start.getMonth() - i);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      end.setMilliseconds(-1);
      const mWhere = branchId ? { branchId } : {};
      return Promise.all([
        this.prisma.contribution.aggregate({
          where: { ...mWhere, contributedAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...mWhere, expenseDate: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]).then(([inc, exp]) => ({
        label: start.toLocaleDateString('en-NG', { month: 'short' }),
        income: num(inc._sum.amount),
        expense: num(exp._sum.amount),
      }));
    });

    const [income, expenseSum, byTypeRaw, byCategoryRaw, monthIncome, monthExpense, pledgeAgg, monthlyTrend] =
      await Promise.all([
        this.prisma.contribution.aggregate({ where: cWhere, _sum: { amount: true }, _count: true }),
        this.prisma.expense.aggregate({ where: eWhere, _sum: { amount: true }, _count: true }),
        this.prisma.contribution.groupBy({ by: ['givingTypeId'], where: cWhere, _sum: { amount: true } }),
        this.prisma.expense.groupBy({ by: ['categoryId'], where: eWhere, _sum: { amount: true } }),
        this.prisma.contribution.aggregate({
          where: { ...(branchId ? { branchId } : {}), contributedAt: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        this.prisma.expense.aggregate({
          where: { ...(branchId ? { branchId } : {}), expenseDate: { gte: startOfMonth } },
          _sum: { amount: true },
        }),
        this.prisma.pledge.aggregate({
          where: branchId ? { branchId } : {},
          _sum: { amount: true, fulfilledAmount: true },
        }),
        Promise.all(monthPromises),
      ]);

    const typeIds = byTypeRaw.map((t) => t.givingTypeId).filter(Boolean) as string[];
    const catIds = byCategoryRaw.map((c) => c.categoryId).filter(Boolean) as string[];

    const [types, categories] = await Promise.all([
      typeIds.length
        ? this.prisma.givingType.findMany({ where: { id: { in: typeIds } } })
        : Promise.resolve([]),
      catIds.length
        ? this.prisma.expenseCategory.findMany({ where: { id: { in: catIds } } })
        : Promise.resolve([]),
    ]);

    const typeMap = new Map<string, string>();
    for (const t of types) typeMap.set(t.id, t.name);
    const catMap = new Map<string, string>();
    for (const c of categories) catMap.set(c.id, c.name);

    const totalIncome = num(income._sum.amount);
    const totalExpense = num(expenseSum._sum.amount);

    return {
      totalIncome,
      totalExpense,
      netBalance: totalIncome - totalExpense,
      contributionCount: income._count,
      expenseCount: expenseSum._count,
      monthIncome: num(monthIncome._sum.amount),
      monthExpense: num(monthExpense._sum.amount),
      pledgedTotal: num(pledgeAgg._sum.amount),
      pledgeFulfilled: num(pledgeAgg._sum.fulfilledAmount),
      byType: byTypeRaw
        .map((t) => ({
          id: t.givingTypeId,
          name: t.givingTypeId ? (typeMap.get(t.givingTypeId) ?? 'Unknown') : 'Uncategorized',
          amount: num(t._sum.amount),
        }))
        .sort((a, b) => b.amount - a.amount),
      byCategory: byCategoryRaw
        .map((c) => ({
          id: c.categoryId,
          name: c.categoryId ? (catMap.get(c.categoryId) ?? 'Unknown') : 'Uncategorized',
          amount: num(c._sum.amount),
        }))
        .sort((a, b) => b.amount - a.amount),
      monthlyTrend,
    };
  }

  private contributionWhere(query: FinanceQueryDto): Prisma.ContributionWhereInput {
    const { branchId, givingTypeId, from, to, search } = query;
    return {
      ...(branchId ? { branchId } : {}),
      ...(givingTypeId ? { givingTypeId } : {}),
      ...(this.dateRange(from, to) ? { contributedAt: this.dateRange(from, to) } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search } },
              { receiptNumber: { contains: search } },
              { member: { firstName: { contains: search } } },
              { member: { lastName: { contains: search } } },
              { donorName: { contains: search } },
              { donorEmail: { contains: search } },
              { givingType: { name: { contains: search } } },
            ],
          }
        : {}),
    };
  }

  private expenseWhere(query: FinanceQueryDto): Prisma.ExpenseWhereInput {
    const { branchId, categoryId, from, to, search } = query;
    return {
      ...(branchId ? { branchId } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(this.dateRange(from, to) ? { expenseDate: this.dateRange(from, to) } : {}),
      ...(search
        ? {
            OR: [
              { category: { name: { contains: search } } },
              { paidTo: { contains: search } },
              { reference: { contains: search } },
              { description: { contains: search } },
            ],
          }
        : {}),
    };
  }

  private startOfMonth(): Date {
    const d = new Date();
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // ---------------- Stats ----------------
  async contributionStats(query: FinanceQueryDto) {
    const where = this.contributionWhere(query);
    const monthWhere: Prisma.ContributionWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.givingTypeId ? { givingTypeId: query.givingTypeId } : {}),
      contributedAt: { gte: this.startOfMonth() },
    };

    const [agg, monthAgg, typeCount] = await Promise.all([
      this.prisma.contribution.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.contribution.aggregate({ where: monthWhere, _sum: { amount: true }, _count: true }),
      this.prisma.givingType.count({
        where: query.branchId ? { branchId: query.branchId } : {},
      }),
    ]);

    const total = agg._count;
    const totalAmount = num(agg._sum.amount);
    return {
      total,
      totalAmount,
      monthCount: monthAgg._count,
      monthAmount: num(monthAgg._sum.amount),
      averageAmount: total > 0 ? totalAmount / total : 0,
      givingTypes: typeCount,
    };
  }

  async expenseStats(query: FinanceQueryDto) {
    const where = this.expenseWhere(query);
    const monthWhere: Prisma.ExpenseWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      expenseDate: { gte: this.startOfMonth() },
    };

    const [agg, monthAgg, categoryCount] = await Promise.all([
      this.prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
      this.prisma.expense.aggregate({ where: monthWhere, _sum: { amount: true }, _count: true }),
      this.prisma.expenseCategory.count({
        where: query.branchId ? { branchId: query.branchId } : {},
      }),
    ]);

    const total = agg._count;
    const totalAmount = num(agg._sum.amount);
    return {
      total,
      totalAmount,
      monthCount: monthAgg._count,
      monthAmount: num(monthAgg._sum.amount),
      averageAmount: total > 0 ? totalAmount / total : 0,
      categories: categoryCount,
    };
  }

  async fundStats(branchId?: string, from?: string, to?: string) {
    const funds = await this.listFunds(branchId, from, to);
    const active = funds.filter((f) => f.isActive !== false);
    const byCurrency: Record<string, { totalBalance: number; totalIn: number; totalOut: number }> =
      {};
    for (const f of funds) {
      const cur = f.currency ?? 'NGN';
      if (!byCurrency[cur]) byCurrency[cur] = { totalBalance: 0, totalIn: 0, totalOut: 0 };
      byCurrency[cur].totalBalance += f.balance;
      byCurrency[cur].totalIn += f.totalIn;
      byCurrency[cur].totalOut += f.totalOut;
    }
    return {
      total: funds.length,
      active: active.length,
      totalBalance: funds.reduce((s, f) => s + f.balance, 0),
      totalIn: funds.reduce((s, f) => s + f.totalIn, 0),
      totalOut: funds.reduce((s, f) => s + f.totalOut, 0),
      byCurrency,
    };
  }

  private async isDuplicateTransaction(fundId: string, reference?: string) {
    if (!reference?.trim()) return false;
    const ref = reference.trim();
    const [contribution, expense] = await Promise.all([
      this.prisma.contribution.findFirst({ where: { fundId, reference: ref } }),
      this.prisma.expense.findFirst({ where: { fundId, reference: ref } }),
    ]);
    return !!(contribution || expense);
  }

  async previewStatementImport(buffer: Buffer, fundId: string, branchId: string) {
    const fund = await this.getFund(fundId);
    if (fund.branchId !== branchId) {
      throw new ForbiddenException('Account does not belong to this branch');
    }

    const parsed = await parseStatementBuffer(buffer);
    const [givingTypes, categories] = await Promise.all([
      this.listGivingTypes(branchId),
      this.listExpenseCategories(branchId),
    ]);

    const gtByName = new Map(givingTypes.map((g) => [g.name.toLowerCase(), g]));
    const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c]));
    const defaultGt = givingTypes.find((g) => g.name === 'Donation') ?? givingTypes[0];
    const defaultCat = categories.find((c) => c.name === 'Office Supplies') ?? categories[0];

    const rows = await Promise.all(
      parsed.rows.map(async (row) => {
        const duplicate = await this.isDuplicateTransaction(fundId, row.transactionRef);
        let givingTypeId: string | undefined;
        let categoryId: string | undefined;
        let suggestedGivingTypeName: string | undefined;
        let suggestedCategoryName: string | undefined;

        if (row.kind === 'income') {
          suggestedGivingTypeName = suggestGivingTypeName(row.description);
          givingTypeId =
            gtByName.get(suggestedGivingTypeName.toLowerCase())?.id ?? defaultGt?.id;
        } else {
          suggestedCategoryName = suggestExpenseCategoryName(row.description);
          categoryId = catByName.get(suggestedCategoryName.toLowerCase())?.id ?? defaultCat?.id;
        }

        return {
          ...row,
          duplicate,
          givingTypeId,
          categoryId,
          suggestedGivingTypeName,
          suggestedCategoryName,
        };
      }),
    );

    const importable = rows.filter((r) => !r.duplicate);
    return {
      format: parsed.format,
      accountMeta: parsed.accountMeta,
      fund: { id: fund.id, name: fund.name, currency: fund.currency },
      rows,
      stats: {
        total: rows.length,
        duplicates: rows.filter((r) => r.duplicate).length,
        income: importable.filter((r) => r.kind === 'income').length,
        expense: importable.filter((r) => r.kind === 'expense').length,
        incomeAmount: importable
          .filter((r) => r.kind === 'income')
          .reduce((s, r) => s + r.amount, 0),
        expenseAmount: importable
          .filter((r) => r.kind === 'expense')
          .reduce((s, r) => s + r.amount, 0),
      },
    };
  }

  async commitStatementImport(dto: CommitStatementImportDto, userId: string) {
    const fund = await this.getFund(dto.fundId);
    if (fund.branchId !== dto.branchId) {
      throw new ForbiddenException('Account does not belong to this branch');
    }

    let incomeCreated = 0;
    let expenseCreated = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (const row of dto.rows) {
      if (row.skip) {
        skipped++;
        continue;
      }

      if (row.transactionRef && (await this.isDuplicateTransaction(dto.fundId, row.transactionRef))) {
        skipped++;
        continue;
      }

      try {
        if (row.kind === 'income') {
          if (!row.givingTypeId) {
            errors.push({ row: row.rowNumber, message: 'Income type is required' });
            continue;
          }
          await this.prisma.contribution.create({
            data: {
              branchId: dto.branchId,
              fundId: dto.fundId,
              givingTypeId: row.givingTypeId,
              amount: row.amount,
              contributedAt: new Date(row.date),
              paymentMethod: 'TRANSFER',
              reference: row.transactionRef || undefined,
              note: row.description,
              recordedById: userId,
            },
          });
          incomeCreated++;
        } else {
          if (!row.categoryId) {
            errors.push({ row: row.rowNumber, message: 'Expense category is required' });
            continue;
          }
          await this.prisma.expense.create({
            data: {
              branchId: dto.branchId,
              fundId: dto.fundId,
              categoryId: row.categoryId,
              amount: row.amount,
              expenseDate: new Date(row.date),
              paymentMethod: 'TRANSFER',
              reference: row.transactionRef || undefined,
              description: row.description,
              recordedById: userId,
            },
          });
          expenseCreated++;
        }
      } catch (e) {
        errors.push({
          row: row.rowNumber,
          message: e instanceof Error ? e.message : 'Failed to import row',
        });
      }
    }

    return { incomeCreated, expenseCreated, skipped, errors };
  }

  async generateImportTemplate(): Promise<Buffer> {
    const mod = await import('exceljs');
    const ExcelJS = mod.default ?? mod;
    const wb = new ExcelJS.Workbook();

    const guide = wb.addWorksheet('Instructions');
    guide.getColumn(1).width = 90;
    const lines = [
      'ChMS Finance — Bank Statement Import Guide',
      '',
      'Supported formats:',
      '1. Zenith Bank export — upload the .xlsx Activity Statement as downloaded (no changes needed).',
      '2. Generic template — use the "Import_Template" sheet in this file.',
      '',
      'Generic template columns:',
      'Date | Description | Debit Amount | Credit Amount | Transaction Ref | Type (optional: income or expense)',
      '',
      'Rules:',
      '- Credit Amount = money in (income). Debit Amount = money out (expense).',
      '- Each row must have either a debit OR a credit, not both.',
      '- Date format: DD/MM/YYYY or YYYY-MM-DD.',
      '- Transaction Ref is used to skip duplicates on re-import.',
      '',
      'After upload, review suggested income types and expense categories before confirming import.',
    ];
    lines.forEach((line, i) => {
      guide.getCell(i + 1, 1).value = line;
    });
    guide.getCell(1, 1).font = { bold: true, size: 14 };

    const ws = wb.addWorksheet('Import_Template');
    ws.columns = [
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Description', key: 'description', width: 48 },
      { header: 'Debit Amount', key: 'debit', width: 16 },
      { header: 'Credit Amount', key: 'credit', width: 16 },
      { header: 'Transaction Ref', key: 'ref', width: 22 },
      { header: 'Type (optional)', key: 'type', width: 14 },
    ];
    ws.getRow(1).font = { bold: true };
    ws.addRow({
      date: '01/05/2026',
      description: 'CIP CR/ MEMBER NAME/offering',
      debit: '',
      credit: '5,000.00',
      ref: '001ZEXA26120O78H',
      type: 'income',
    });
    ws.addRow({
      date: '02/05/2026',
      description: 'NIP transfer to vendor for supplies',
      debit: '25,000.00',
      credit: '',
      ref: '210ZEXA2612005Ti',
      type: 'expense',
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  async pledgeStats(branchId?: string) {
    const pledges = await this.listPledges(branchId);
    const active = pledges.filter((p) => p.status === 'ACTIVE');
    const totalPledged = pledges.reduce((s, p) => s + p.amount, 0);
    const totalFulfilled = pledges.reduce((s, p) => s + p.fulfilledAmount, 0);
    return {
      total: pledges.length,
      active: active.length,
      totalPledged,
      totalFulfilled,
      totalOutstanding: totalPledged - totalFulfilled,
      fulfilledCount: pledges.filter((p) => p.status === 'FULFILLED').length,
    };
  }
}
