import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { MessageChannel, MessageStatus, RecipientStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import { CreateTemplateDto, SendMessageDto, UpdateTemplateDto } from './dto/comms.dto';

@Injectable()
export class CommsService {
  private readonly logger = new Logger(CommsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  // ---- Templates ----
  listTemplates(channel?: MessageChannel) {
    return this.prisma.messageTemplate.findMany({
      where: channel ? { channel } : {},
      orderBy: { name: 'asc' },
    });
  }

  createTemplate(dto: CreateTemplateDto) {
    return this.prisma.messageTemplate.create({ data: dto });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.ensureTemplate(id);
    return this.prisma.messageTemplate.update({ where: { id }, data: dto });
  }

  async removeTemplate(id: string) {
    await this.ensureTemplate(id);
    await this.prisma.messageTemplate.delete({ where: { id } });
    return { success: true };
  }

  private async ensureTemplate(id: string) {
    const t = await this.prisma.messageTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }

  // ---- Messages ----
  listMessages(branchId?: string) {
    return this.prisma.message.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      include: {
        branch: { select: { id: true, name: true } },
        _count: { select: { recipients: true } },
      },
    });
  }

  async getMessage(id: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        recipients: {
          include: { member: { select: { id: true, firstName: true, lastName: true } } },
        },
      },
    });
    if (!msg) throw new NotFoundException('Message not found');
    return msg;
  }

  /** Resolve recipients from member IDs and/or explicit addresses. */
  private async resolveRecipients(
    channel: MessageChannel,
    memberIds?: string[],
    custom?: { memberId?: string; name?: string; address: string }[],
  ) {
    const out: { memberId?: string; name?: string; address: string }[] = [];

    if (memberIds?.length) {
      const members = await this.prisma.member.findMany({
        where: { id: { in: memberIds } },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      });
      for (const m of members) {
        const address = channel === MessageChannel.EMAIL ? m.email : m.phone;
        if (!address) continue;
        out.push({
          memberId: m.id,
          name: `${m.firstName} ${m.lastName}`,
          address,
        });
      }
    }

    if (custom?.length) {
      for (const r of custom) {
        if (r.address) out.push(r);
      }
    }

    if (!out.length) throw new BadRequestException('No valid recipients found');
    return out;
  }

  /** Send a broadcast (synchronous; SMTP when configured). */
  async send(dto: SendMessageDto, userId?: string) {
    const recipients = await this.resolveRecipients(dto.channel, dto.memberIds, dto.recipients);

    const message = await this.prisma.message.create({
      data: {
        branchId: dto.branchId,
        channel: dto.channel,
        subject: dto.subject,
        body: dto.body,
        status: MessageStatus.QUEUED,
        recipientCount: recipients.length,
        createdById: userId,
        recipients: {
          create: recipients.map((r) => ({
            memberId: r.memberId,
            name: r.name,
            address: r.address,
            status: RecipientStatus.PENDING,
          })),
        },
      },
      include: { recipients: true },
    });

    let sent = 0;
    let failed = 0;

    for (const rec of message.recipients) {
      try {
        await this.dispatch(dto.channel, rec.address, dto.subject, dto.body);
        await this.prisma.messageRecipient.update({
          where: { id: rec.id },
          data: { status: RecipientStatus.SENT, sentAt: new Date() },
        });
        sent++;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Send failed';
        await this.prisma.messageRecipient.update({
          where: { id: rec.id },
          data: { status: RecipientStatus.FAILED, error },
        });
        failed++;
        this.logger.warn(`Failed to send to ${rec.address}: ${error}`);
      }
    }

    const status =
      failed === 0 ? MessageStatus.SENT : sent === 0 ? MessageStatus.FAILED : MessageStatus.SENT;

    return this.prisma.message.update({
      where: { id: message.id },
      data: { status, sentCount: sent, failedCount: failed, sentAt: new Date() },
      include: { _count: { select: { recipients: true } } },
    });
  }

  /** Dispatch via email (SMTP) or SMS (Termii when configured). */
  private async dispatch(
    channel: MessageChannel,
    address: string,
    subject: string | undefined,
    body: string,
  ): Promise<void> {
    if (channel === MessageChannel.EMAIL) {
      await this.mail.send(address, subject ?? 'Message from Church', body);
      return;
    }
    await this.sms.send(address, body);
  }
}
