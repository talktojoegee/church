import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { BulkSmsStatus, BulkSmsRecurrence, BulkSmsScheduleStatus, Prisma, SmsSenderIdStatus, SmsWalletTxType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BulkSmsGatewayService } from './bulksms-gateway.service';
import {
  PhoneGroupDto,
  PreviewBulkSmsDto,
  ScheduleBulkSmsDto,
  SendBulkSmsDto,
  SenderIdDto,
  UpdatePhoneGroupDto,
  VerifyWalletTopUpDto,
} from './dto/bulksms.dto';
import {
  appendCountryCode,
  calculatePaystackCharge,
  DEFAULT_SENDER_ID,
  detectNetwork,
  parsePhoneList,
  parseRecipientDetails,
  retailerSmsCost,
  smsPages,
} from './sms-helper';
import {
  computeFollowingWeeklyRun,
  computeInitialNextRunAt,
  formatRecurrenceDays,
} from './schedule-helper';

const num = (v: Prisma.Decimal | number | null | undefined): number =>
  v == null ? 0 : Number(v);

const normalizeBranchId = (branchId?: string): string | undefined => {
  const id = branchId?.trim();
  return id || undefined;
};

@Injectable()
export class BulkSmsService {
  private readonly logger = new Logger(BulkSmsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: BulkSmsGatewayService,
  ) {}

  // ---------------- Wallet ----------------
  async getOrCreateWallet(branchId?: string) {
    const id = normalizeBranchId(branchId);
    const existing = await this.prisma.smsWallet.findFirst({
      where: id ? { branchId: id } : { branchId: null },
    });
    if (existing) return existing;
    return this.prisma.smsWallet.create({
      data: { branchId: id ?? null, balance: 0 },
    });
  }

  async walletSummary(branchId?: string) {
    const wallet = await this.getOrCreateWallet(branchId);
    const txs = await this.prisma.smsWalletTransaction.findMany({
      where: { walletId: wallet.id },
      select: { type: true, amount: true },
    });
    let totalCredited = 0;
    let totalDebited = 0;
    for (const tx of txs) {
      const amt = num(tx.amount);
      if (tx.type === 'CREDIT') totalCredited += amt;
      else totalDebited += amt;
    }
    return {
      id: wallet.id,
      balance: num(wallet.balance),
      totalCredited,
      totalDebited,
      paystackPublicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
      paystackConfigured: !!(process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_SECRET_KEY),
    };
  }

  async listTransactions(branchId?: string, page = 1, pageSize = 20) {
    const wallet = await this.getOrCreateWallet(branchId);
    const [items, total] = await Promise.all([
      this.prisma.smsWalletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.smsWalletTransaction.count({ where: { walletId: wallet.id } }),
    ]);
    return {
      items: items.map((t) => ({
        ...t,
        amount: num(t.amount),
      })),
      total,
      page,
      pageSize,
    };
  }

  async verifyTopUp(dto: VerifyWalletTopUpDto) {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) throw new BadRequestException('Paystack is not configured');

    const body = await this.fetchPaystackVerification(dto.reference, secretKey);

    if (!body.status || body.data?.status !== 'success') {
      throw new BadRequestException('Payment verification failed');
    }

    const paidAmount = (body.data?.amount ?? 0) / 100;
    const walletAmount = dto.amount;
    const paystackFee = calculatePaystackCharge(walletAmount);
    const expectedTotal = Math.round((walletAmount + paystackFee) * 100) / 100;

    if (paidAmount + 0.01 < walletAmount) {
      throw new BadRequestException('Paid amount is less than the requested top-up');
    }
    if (Math.abs(paidAmount - expectedTotal) > 1.5) {
      this.logger.warn(
        `Paystack amount mismatch for ${dto.reference}: paid ${paidAmount}, expected ${expectedTotal}`,
      );
    }

    const wallet = await this.getOrCreateWallet(normalizeBranchId(dto.branchId));
    const existing = await this.prisma.smsWalletTransaction.findFirst({
      where: { externalRef: dto.reference },
    });
    if (existing) {
      return { credited: num(existing.amount), reference: dto.reference, duplicate: true };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.smsWallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: walletAmount } },
      });
      await tx.smsWalletTransaction.create({
        data: {
          walletId: wallet.id,
          type: SmsWalletTxType.CREDIT,
          amount: walletAmount,
          description: `Wallet top-up via Paystack (paid ₦${paidAmount.toFixed(2)})`,
          reference: dto.reference,
          provider: 'paystack',
          externalRef: dto.reference,
        },
      });
    });

    return { credited: walletAmount, reference: dto.reference, duplicate: false };
  }

  private async fetchPaystackVerification(reference: string, secretKey: string) {
    const url = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(30_000),
        });

        const body = (await res.json()) as {
          status?: boolean;
          message?: string;
          data?: { status?: string; amount?: number };
        };

        if (!res.ok) {
          throw new BadRequestException(body.message ?? 'Paystack verification failed');
        }

        return body;
      } catch (err) {
        lastError = err;
        if (err instanceof BadRequestException) throw err;
        this.logger.warn(
          `Paystack verify attempt ${attempt}/3 failed for ${reference}: ${err instanceof Error ? err.message : err}`,
        );
        if (attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      }
    }

    this.logger.error(
      `Paystack verify exhausted retries for ${reference}`,
      lastError instanceof Error ? lastError.stack : String(lastError),
    );
    throw new BadRequestException(
      'Could not verify payment with Paystack. If you were charged, wait a moment and try again — your reference is saved.',
    );
  }

  private async debitWallet(
    walletId: string,
    amount: number,
    description: string,
    reference: string,
  ) {
    const wallet = await this.prisma.smsWallet.findUnique({ where: { id: walletId } });
    if (!wallet || num(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient SMS wallet balance');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.smsWallet.update({
        where: { id: walletId },
        data: { balance: { decrement: amount } },
      });
      await tx.smsWalletTransaction.create({
        data: {
          walletId,
          type: SmsWalletTxType.DEBIT,
          amount,
          description,
          reference,
        },
      });
    });
  }

  private async creditWallet(
    walletId: string,
    amount: number,
    description: string,
    reference: string,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.smsWallet.update({
        where: { id: walletId },
        data: { balance: { increment: amount } },
      });
      await tx.smsWalletTransaction.create({
        data: {
          walletId,
          type: SmsWalletTxType.CREDIT,
          amount,
          description,
          reference: `${reference}-REFUND`,
        },
      });
    });
  }

  // ---------------- Phone groups ----------------
  async listPhoneGroups(branchId?: string) {
    const id = normalizeBranchId(branchId);
    const groups = await this.prisma.smsPhoneGroup.findMany({
      where: id ? { branchId: id } : {},
      orderBy: { name: 'asc' },
    });
    return groups.map((g) => ({
      ...g,
      contactCount: parsePhoneList(g.phoneNumbers).length,
    }));
  }

  async createPhoneGroup(dto: PhoneGroupDto, userId?: string) {
    const numbers = parsePhoneList(dto.phoneNumbers);
    if (!numbers.length) throw new BadRequestException('No valid phone numbers found');
    return this.prisma.smsPhoneGroup.create({
      data: {
        name: dto.name,
        phoneNumbers: numbers.join(','),
        branchId: normalizeBranchId(dto.branchId) ?? null,
        createdById: userId,
      },
    });
  }

  async updatePhoneGroup(id: string, dto: UpdatePhoneGroupDto) {
    await this.getPhoneGroup(id);
    const numbers = parsePhoneList(dto.phoneNumbers);
    if (!numbers.length) throw new BadRequestException('No valid phone numbers found');
    return this.prisma.smsPhoneGroup.update({
      where: { id },
      data: { name: dto.name, phoneNumbers: numbers.join(',') },
    });
  }

  async removePhoneGroup(id: string) {
    await this.getPhoneGroup(id);
    await this.prisma.smsPhoneGroup.delete({ where: { id } });
    return { success: true };
  }

  private async getPhoneGroup(id: string) {
    const g = await this.prisma.smsPhoneGroup.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Phone group not found');
    return g;
  }

  // ---------------- Sender IDs ----------------
  async listSenderIds(branchId?: string) {
    const id = normalizeBranchId(branchId);
    return this.prisma.smsSenderId.findMany({
      where: id ? { branchId: id } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async createSenderId(dto: SenderIdDto, userId?: string) {
    if (!/^[a-zA-Z\s-]+$/.test(dto.senderId)) {
      throw new BadRequestException('Sender ID must be alphabetic (max 11 characters)');
    }
    const record = await this.prisma.smsSenderId.create({
      data: {
        senderId: dto.senderId,
        purpose: dto.purpose,
        branchId: normalizeBranchId(dto.branchId) ?? null,
        createdById: userId,
        status: SmsSenderIdStatus.PENDING,
      },
    });
    const kudi = await this.gateway.submitSenderIdToKudi(dto.senderId, dto.purpose);
    return { ...record, kudiSubmission: kudi };
  }

  async refreshSenderId(id: string) {
    const record = await this.prisma.smsSenderId.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Sender ID not found');
    const result = await this.gateway.refreshSenderIdStatus(record.senderId);
    if (result.approved) {
      await this.prisma.smsSenderId.update({
        where: { id },
        data: { status: SmsSenderIdStatus.APPROVED },
      });
    }
    return { ...result, status: result.approved ? 'APPROVED' : record.status };
  }

  // ---------------- Compose / send ----------------
  private async resolveRecipients(dto: PreviewBulkSmsDto): Promise<string[]> {
    const numbers: string[] = [];

    if (dto.phoneGroupIds?.length) {
      const groups = await this.prisma.smsPhoneGroup.findMany({
        where: { id: { in: dto.phoneGroupIds } },
      });
      for (const group of groups) {
        numbers.push(...parsePhoneList(group.phoneNumbers));
      }
    }

    if (dto.phoneNumbers?.trim()) {
      numbers.push(...parsePhoneList(dto.phoneNumbers));
    }

    return [...new Set(numbers)];
  }

  async preview(dto: PreviewBulkSmsDto) {
    if (!dto.phoneGroupIds?.length && !dto.phoneNumbers?.trim()) {
      throw new BadRequestException('Select a phone group or enter phone numbers');
    }

    const numbers = await this.resolveRecipients(dto);
    if (!numbers.length) throw new BadRequestException('No valid phone numbers found');

    const pages = smsPages(dto.message);
    const retail = retailerSmsCost(pages);
    const retailPrice = retail.totalCost * numbers.length;

    const networkSummary: Record<string, number> = {};
    for (const n of numbers) {
      const network = detectNetwork(n);
      networkSummary[network] = (networkSummary[network] ?? 0) + 1;
    }

    const wallet = await this.walletSummary(dto.branchId);

    return {
      senderId: dto.senderId,
      message: dto.message,
      phoneNumbers: numbers.join(','),
      persons: numbers.length,
      pages,
      unitCost: retail.unitCost,
      retailPrice,
      networkSummary,
      walletBalance: wallet.balance,
      hasEnoughBalance: wallet.balance >= retailPrice,
      shortfall: Math.max(0, retailPrice - wallet.balance),
    };
  }

  async send(dto: SendBulkSmsDto, userId?: string) {
    const numbers = dto.phoneNumbersResolved.split(',').map((n) => n.trim()).filter(Boolean);
    if (!numbers.length) {
      throw new BadRequestException('No valid phone numbers found');
    }

    const pages = smsPages(dto.message);
    const retail = retailerSmsCost(pages);
    const expectedPrice = retail.totalCost * numbers.length;

    if (pages !== dto.pages || numbers.length !== dto.persons) {
      throw new BadRequestException('Recipient count mismatch — please preview again');
    }
    if (Math.abs(expectedPrice - dto.retailPrice) > 0.01) {
      throw new BadRequestException('Cost mismatch — please preview again');
    }

    const wallet = await this.getOrCreateWallet(normalizeBranchId(dto.branchId));
    if (num(wallet.balance) < dto.retailPrice) {
      throw new BadRequestException('Insufficient SMS wallet balance');
    }

    const result = await this.executeBulkSend({
      branchId: normalizeBranchId(dto.branchId),
      senderId: dto.senderId,
      message: dto.message,
      numbers,
      retailPrice: dto.retailPrice,
      pages: dto.pages,
      persons: dto.persons,
      phoneNumbersResolved: dto.phoneNumbersResolved,
      userId,
    });

    if (!result.success) {
      throw new BadRequestException(result.error ?? 'SMS sending failed');
    }

    return result.record!;
  }

  private async executeBulkSend(params: {
    branchId?: string;
    senderId: string;
    message: string;
    numbers: string[];
    retailPrice: number;
    pages: number;
    persons: number;
    phoneNumbersResolved: string;
    userId?: string;
    scheduleId?: string;
  }): Promise<{ success: boolean; record?: Awaited<ReturnType<typeof this.prisma.bulkSmsMessage.create>>; error?: string }> {
    const wallet = await this.getOrCreateWallet(params.branchId);
    if (num(wallet.balance) < params.retailPrice) {
      return { success: false, error: 'Insufficient SMS wallet balance' };
    }

    const ref = `SMS-${Date.now().toString(36).toUpperCase()}`;
    const debitDescription = `Bulk SMS — ${params.persons} recipients, ${params.pages} page(s)`;
    let debited = false;

    try {
      await this.debitWallet(wallet.id, params.retailPrice, debitDescription, ref);
      debited = true;

      const senderId =
        params.senderId === DEFAULT_SENDER_ID
          ? (process.env.SMS_SENDER_ID ?? DEFAULT_SENDER_ID)
          : params.senderId;

      const { success, gateway, response } = await this.gateway.sendBulk(
        senderId,
        params.numbers,
        params.message,
      );

      const record = await this.prisma.bulkSmsMessage.create({
        data: {
          branchId: params.branchId ?? null,
          scheduleId: params.scheduleId ?? null,
          senderIdLabel: params.senderId,
          phoneNumbers: params.phoneNumbersResolved,
          message: params.message,
          pages: params.pages,
          recipientCount: params.persons,
          cost: params.retailPrice,
          status: success ? BulkSmsStatus.SENT : BulkSmsStatus.FAILED,
          gateway,
          responseData: response as Prisma.InputJsonValue,
          sentById: params.userId,
          sentAt: success ? new Date() : null,
        },
      });

      if (!success) {
        await this.creditWallet(
          wallet.id,
          params.retailPrice,
          `Refund — SMS send failed (${ref})`,
          ref,
        );
        debited = false;
        const errMsg =
          (response as { message?: string })?.message ??
          (response as { errorMessage?: string })?.errorMessage ??
          'SMS sending failed';
        return { success: false, record, error: errMsg };
      }

      return { success: true, record };
    } catch (err) {
      if (debited) {
        try {
          await this.creditWallet(
            wallet.id,
            params.retailPrice,
            `Refund — SMS send error (${ref})`,
            ref,
          );
        } catch (refundErr) {
          this.logger.error(
            `Failed to refund ${params.retailPrice} for ${ref}`,
            refundErr instanceof Error ? refundErr.stack : String(refundErr),
          );
        }
      }
      throw err;
    }
  }

  // ---------------- Schedule ----------------
  async createSchedule(dto: ScheduleBulkSmsDto, userId?: string) {
    if (!dto.phoneGroupIds?.length && !dto.phoneNumbers?.trim()) {
      throw new BadRequestException('Select a phone group or enter phone numbers');
    }

    const numbers = await this.resolveRecipients(dto);
    if (!numbers.length) throw new BadRequestException('No valid phone numbers found');

    const pages = smsPages(dto.message);
    const retail = retailerSmsCost(pages);
    const estimatedCost = retail.totalCost * numbers.length;
    const wallet = await this.getOrCreateWallet(normalizeBranchId(dto.branchId));
    if (num(wallet.balance) < estimatedCost) {
      throw new BadRequestException('Insufficient SMS wallet balance for this scheduled message');
    }

    const scheduledAt = new Date(dto.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled date/time');
    }

    const recurrenceDays =
      dto.recurrence === BulkSmsRecurrence.WEEKLY ? (dto.recurrenceDays ?? []) : [];
    const nextRunAt = computeInitialNextRunAt(scheduledAt, dto.recurrence, recurrenceDays);

    const record = await this.prisma.bulkSmsSchedule.create({
      data: {
        branchId: normalizeBranchId(dto.branchId) ?? null,
        senderId: dto.senderId,
        phoneGroupIds: dto.phoneGroupIds?.length
          ? (dto.phoneGroupIds as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        phoneNumbers: dto.phoneNumbers?.trim() || null,
        message: dto.message,
        recurrence: dto.recurrence,
        recurrenceDays: recurrenceDays.length
          ? (recurrenceDays as Prisma.InputJsonValue)
          : Prisma.JsonNull,
        scheduledAt,
        nextRunAt,
        createdById: userId,
      },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });

    return this.formatSchedule(record);
  }

  async listSchedules(branchId?: string, page = 1, pageSize = 20) {
    const id = normalizeBranchId(branchId);
    const where = id ? { branchId: id } : {};
    const [items, total, active, recurring, once, completed] = await Promise.all([
      this.prisma.bulkSmsSchedule.findMany({
        where,
        orderBy: { nextRunAt: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.bulkSmsSchedule.count({ where }),
      this.prisma.bulkSmsSchedule.count({
        where: { ...where, status: BulkSmsScheduleStatus.ACTIVE },
      }),
      this.prisma.bulkSmsSchedule.count({
        where: { ...where, recurrence: BulkSmsRecurrence.WEEKLY },
      }),
      this.prisma.bulkSmsSchedule.count({
        where: { ...where, recurrence: BulkSmsRecurrence.ONCE },
      }),
      this.prisma.bulkSmsSchedule.count({
        where: { ...where, status: BulkSmsScheduleStatus.COMPLETED },
      }),
    ]);
    return {
      items: items.map((s) => this.formatSchedule(s)),
      total,
      page,
      pageSize,
      summary: { active, recurring, once, completed },
    };
  }

  async cancelSchedule(id: string) {
    const record = await this.prisma.bulkSmsSchedule.findUnique({ where: { id } });
    if (!record) throw new NotFoundException('Schedule not found');
    if (record.status !== BulkSmsScheduleStatus.ACTIVE) {
      throw new BadRequestException('Only active schedules can be cancelled');
    }
    return this.formatSchedule(
      await this.prisma.bulkSmsSchedule.update({
        where: { id },
        data: { status: BulkSmsScheduleStatus.CANCELLED },
        include: {
          createdBy: { select: { firstName: true, lastName: true } },
          _count: { select: { messages: true } },
        },
      }),
    );
  }

  async getSchedule(id: string) {
    const schedule = await this.prisma.bulkSmsSchedule.findUnique({
      where: { id },
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            recipientCount: true,
            cost: true,
            status: true,
            sentAt: true,
            createdAt: true,
            pages: true,
          },
        },
      },
    });
    if (!schedule) throw new NotFoundException('Schedule not found');

    const phoneGroupIds = Array.isArray(schedule.phoneGroupIds)
      ? (schedule.phoneGroupIds as string[])
      : [];
    const numbers = await this.resolveRecipients({
      message: schedule.message,
      senderId: schedule.senderId,
      phoneGroupIds: phoneGroupIds.length ? phoneGroupIds : undefined,
      phoneNumbers: schedule.phoneNumbers ?? undefined,
      branchId: schedule.branchId ?? undefined,
    });

    const phoneGroups = phoneGroupIds.length
      ? await this.prisma.smsPhoneGroup.findMany({
          where: { id: { in: phoneGroupIds } },
          select: { id: true, name: true },
        })
      : [];

    const pages = smsPages(schedule.message);
    const retail = retailerSmsCost(pages);
    const estimatedCost = retail.totalCost * numbers.length;

    return {
      ...this.formatSchedule(schedule),
      pages,
      recipientCount: numbers.length,
      estimatedCost,
      phoneNumbersResolved: numbers.join(','),
      phoneGroups: phoneGroups.map((g) => ({ id: g.id, name: g.name })),
      runs: schedule.messages.map((m) => ({
        id: m.id,
        recipientCount: m.recipientCount,
        pages: m.pages,
        cost: num(m.cost),
        status: m.status,
        sentAt: m.sentAt,
        createdAt: m.createdAt,
      })),
    };
  }

  async processDueSchedules() {
    const now = new Date();
    const due = await this.prisma.bulkSmsSchedule.findMany({
      where: {
        status: BulkSmsScheduleStatus.ACTIVE,
        nextRunAt: { lte: now },
      },
      take: 20,
    });

    for (const schedule of due) {
      await this.runScheduledMessage(schedule.id);
    }

    return due.length;
  }

  private async runScheduledMessage(scheduleId: string) {
    const schedule = await this.prisma.bulkSmsSchedule.findUnique({ where: { id: scheduleId } });
    if (!schedule || schedule.status !== BulkSmsScheduleStatus.ACTIVE) return;

    const phoneGroupIds = Array.isArray(schedule.phoneGroupIds)
      ? (schedule.phoneGroupIds as string[])
      : [];
    const numbers = await this.resolveRecipients({
      message: schedule.message,
      senderId: schedule.senderId,
      phoneGroupIds: phoneGroupIds.length ? phoneGroupIds : undefined,
      phoneNumbers: schedule.phoneNumbers ?? undefined,
      branchId: schedule.branchId ?? undefined,
    });

    const runAt = new Date();

    if (!numbers.length) {
      await this.prisma.bulkSmsSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: runAt,
          lastRunError: 'No valid phone numbers found',
          status: BulkSmsScheduleStatus.FAILED,
        },
      });
      return;
    }

    const pages = smsPages(schedule.message);
    const retail = retailerSmsCost(pages);
    const retailPrice = retail.totalCost * numbers.length;

    const result = await this.executeBulkSend({
      branchId: schedule.branchId ?? undefined,
      senderId: schedule.senderId,
      message: schedule.message,
      numbers,
      retailPrice,
      pages,
      persons: numbers.length,
      phoneNumbersResolved: numbers.join(','),
      userId: schedule.createdById ?? undefined,
      scheduleId: schedule.id,
    });

    if (schedule.recurrence === BulkSmsRecurrence.ONCE) {
      await this.prisma.bulkSmsSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: runAt,
          lastRunError: result.success ? null : (result.error ?? 'Send failed'),
          status: result.success ? BulkSmsScheduleStatus.COMPLETED : BulkSmsScheduleStatus.FAILED,
        },
      });
      return;
    }

    const recurrenceDays = Array.isArray(schedule.recurrenceDays)
      ? (schedule.recurrenceDays as number[])
      : [];
    const nextRunAt = computeFollowingWeeklyRun(
      schedule.scheduledAt,
      recurrenceDays,
      runAt,
    );

    await this.prisma.bulkSmsSchedule.update({
      where: { id: schedule.id },
      data: {
        lastRunAt: runAt,
        lastRunError: result.success ? null : (result.error ?? 'Send failed'),
        nextRunAt: nextRunAt ?? runAt,
        status: nextRunAt ? BulkSmsScheduleStatus.ACTIVE : BulkSmsScheduleStatus.COMPLETED,
      },
    });
  }

  private formatSchedule(
    s: {
      id: string;
      branchId: string | null;
      senderId: string;
      phoneGroupIds: unknown;
      phoneNumbers: string | null;
      message: string;
      recurrence: BulkSmsRecurrence;
      recurrenceDays: unknown;
      scheduledAt: Date;
      nextRunAt: Date;
      lastRunAt: Date | null;
      lastRunError: string | null;
      status: BulkSmsScheduleStatus;
      createdAt: Date;
      createdBy?: { firstName: string; lastName: string } | null;
      _count?: { messages: number };
    },
  ) {
    const recurrenceDays = Array.isArray(s.recurrenceDays) ? (s.recurrenceDays as number[]) : [];
    return {
      id: s.id,
      branchId: s.branchId,
      senderId: s.senderId,
      phoneGroupIds: Array.isArray(s.phoneGroupIds) ? s.phoneGroupIds : [],
      phoneNumbers: s.phoneNumbers,
      message: s.message,
      recurrence: s.recurrence,
      recurrenceDays,
      recurrenceLabel:
        s.recurrence === BulkSmsRecurrence.WEEKLY
          ? `Every ${formatRecurrenceDays(recurrenceDays)}`
          : 'Once',
      scheduledAt: s.scheduledAt,
      nextRunAt: s.nextRunAt,
      lastRunAt: s.lastRunAt,
      lastRunError: s.lastRunError,
      status: s.status,
      createdAt: s.createdAt,
      createdBy: s.createdBy
        ? `${s.createdBy.firstName} ${s.createdBy.lastName}`.trim()
        : null,
      runCount: s._count?.messages ?? 0,
    };
  }

  // ---------------- History ----------------
  async listHistory(branchId?: string, page = 1, pageSize = 20) {
    const id = normalizeBranchId(branchId);
    const where = id ? { branchId: id } : {};
    const [items, total, sent, failed, aggregates] = await Promise.all([
      this.prisma.bulkSmsMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          sentBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.bulkSmsMessage.count({ where }),
      this.prisma.bulkSmsMessage.count({ where: { ...where, status: BulkSmsStatus.SENT } }),
      this.prisma.bulkSmsMessage.count({ where: { ...where, status: BulkSmsStatus.FAILED } }),
      this.prisma.bulkSmsMessage.aggregate({
        where,
        _sum: { cost: true, recipientCount: true },
      }),
    ]);
    return {
      items: items.map((m) => ({ ...m, cost: num(m.cost) })),
      total,
      page,
      pageSize,
      summary: {
        sent,
        failed,
        totalCost: num(aggregates._sum.cost),
        totalRecipients: aggregates._sum.recipientCount ?? 0,
      },
    };
  }

  async getMessage(id: string) {
    const message = await this.prisma.bulkSmsMessage.findUnique({
      where: { id },
      include: {
        sentBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!message) throw new NotFoundException('Message not found');

    return {
      id: message.id,
      senderIdLabel: message.senderIdLabel,
      message: message.message,
      pages: message.pages,
      recipientCount: message.recipientCount,
      cost: num(message.cost),
      status: message.status,
      gateway: message.gateway,
      sentAt: message.sentAt,
      createdAt: message.createdAt,
      sentBy: message.sentBy
        ? `${message.sentBy.firstName} ${message.sentBy.lastName}`.trim()
        : null,
      recipients: parseRecipientDetails(
        message.phoneNumbers,
        message.status,
        message.responseData,
      ),
    };
  }

  getPaystackCharge(amount: number) {
    const fee = calculatePaystackCharge(amount);
    return { amount, fee, total: Math.round((amount + fee) * 100) / 100 };
  }
}
