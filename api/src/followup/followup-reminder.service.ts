import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FollowUpStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class FollowUpReminderService {
  private readonly logger = new Logger(FollowUpReminderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** Daily at 8:00 AM — log and email admins about overdue follow-ups. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkDueFollowUps() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const overdue = await this.prisma.followUp.findMany({
      where: {
        status: { in: [FollowUpStatus.OPEN, FollowUpStatus.IN_PROGRESS] },
        dueDate: { lte: endOfToday },
      },
      include: {
        member: { select: { firstName: true, lastName: true } },
        branch: { select: { name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    if (overdue.length === 0) return;

    this.logger.log(`${overdue.length} follow-up(s) due or overdue`);
    for (const f of overdue) {
      const name = f.member
        ? `${f.member.firstName} ${f.member.lastName}`
        : f.contactName ?? 'Unknown';
      this.logger.log(
        `  • [${f.branch.name}] ${name} — ${f.type} (due ${f.dueDate?.toISOString().slice(0, 10) ?? 'ASAP'})`,
      );
    }

    if (!this.mail.isConfigured()) return;

    const recipients = await this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { isSuperAdmin: true },
          {
            roles: {
              some: {
                role: {
                  permissions: {
                    some: { permission: { key: 'membership.followup.view' } },
                  },
                },
              },
            },
          },
        ],
      },
      select: { email: true },
    });

    const emails = [...new Set(recipients.map((u) => u.email).filter(Boolean))];
    if (!emails.length) return;

    const lines = overdue.map((f) => {
      const name = f.member
        ? `${f.member.firstName} ${f.member.lastName}`
        : f.contactName ?? 'Unknown';
      const due = f.dueDate?.toISOString().slice(0, 10) ?? 'ASAP';
      return `• [${f.branch.name}] ${name} — ${f.type} (due ${due})`;
    });

    const body = `Good morning,\n\nThe following ${overdue.length} follow-up(s) are due or overdue:\n\n${lines.join('\n')}\n\nPlease log in to the Church Management System to review and update them.`;
    const html = `<p>Good morning,</p><p>The following <strong>${overdue.length}</strong> follow-up(s) are due or overdue:</p><ul>${overdue
      .map((f) => {
        const name = f.member
          ? `${f.member.firstName} ${f.member.lastName}`
          : f.contactName ?? 'Unknown';
        const due = f.dueDate?.toISOString().slice(0, 10) ?? 'ASAP';
        return `<li><strong>[${f.branch.name}]</strong> ${name} — ${f.type} (due ${due})</li>`;
      })
      .join('')}</ul><p>Please log in to review and update them.</p>`;

    for (const email of emails) {
      try {
        await this.mail.send(email, `${overdue.length} follow-up(s) due today`, body, html);
      } catch (err) {
        this.logger.warn(`Failed to email ${email}: ${err instanceof Error ? err.message : err}`);
      }
    }
  }
}
