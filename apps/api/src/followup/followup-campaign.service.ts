import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FollowUpRecipientStatus, FollowUpStatus, FollowUpType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import {
  CreateFollowUpCampaignDto,
  SendFollowUpMessageDto,
  UpdateFollowUpRecipientDto,
} from './dto/followup.dto';

const memberSel = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    phone: true,
    email: true,
    status: true,
    membershipNumber: true,
    photoUrl: true,
    pastoralRole: true,
    isBaptizedWater: true,
    isBaptizedSpirit: true,
    baptismDate: true,
    employer: true,
    emergencyName: true,
    emergencyPhone: true,
    branch: { select: { id: true, name: true } },
  },
};

const branchSel = { select: { id: true, name: true } };

const assigneeUserSel = {
  select: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
  },
};

const assigneeInclude = {
  include: { user: assigneeUserSel },
};

@Injectable()
export class FollowUpCampaignService {
  private readonly logger = new Logger(FollowUpCampaignService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  listCampaigns(status?: FollowUpStatus, branchId?: string) {
    return this.prisma.followUpCampaign.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(branchId ? { branchId } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      include: {
        branch: branchSel,
        _count: { select: { recipients: true } },
        recipients: {
          select: { status: true },
        },
        assignees: assigneeInclude,
      },
    });
  }

  async getCampaign(id: string) {
    const campaign = await this.prisma.followUpCampaign.findUnique({
      where: { id },
      include: {
        branch: branchSel,
        assignees: assigneeInclude,
        recipients: {
          orderBy: [{ status: 'asc' }, { contactName: 'asc' }],
          include: { member: memberSel },
        },
      },
    });
    if (!campaign) throw new NotFoundException('Follow-up campaign not found');
    return campaign;
  }

  async createCampaign(dto: CreateFollowUpCampaignDto, userId?: string) {
    if (!dto.memberIds?.length) {
      throw new BadRequestException('Select at least one person to follow up');
    }

    const members = await this.prisma.member.findMany({
      where: { id: { in: dto.memberIds }, branchId: dto.branchId },
    });

    if (!members.length) {
      throw new BadRequestException('No valid members found for this branch');
    }

    let assignees: { id: string; firstName: string; lastName: string; email: string; phone: string | null }[] = [];
    if (dto.assigneeIds?.length) {
      assignees = await this.prisma.user.findMany({
        where: {
          id: { in: dto.assigneeIds },
          isActive: true,
          OR: [{ branchId: dto.branchId }, { branchId: null }, { isSuperAdmin: true }],
        },
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      });
      if (!assignees.length) {
        throw new BadRequestException('No valid responsible persons selected');
      }
    }

    const campaign = await this.prisma.followUpCampaign.create({
      data: {
        branchId: dto.branchId,
        title: dto.title,
        objective: dto.objective,
        type: dto.type,
        notes: dto.notes,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        createdById: userId,
        recipients: {
          create: members.map((m) => ({
            memberId: m.id,
            contactName: `${m.firstName} ${m.lastName}`,
            contactPhone: m.phone,
            contactEmail: m.email,
          })),
        },
        ...(assignees.length
          ? {
              assignees: {
                create: assignees.map((u) => ({ userId: u.id })),
              },
            }
          : {}),
      },
      include: {
        branch: branchSel,
        _count: { select: { recipients: true } },
        assignees: assigneeInclude,
      },
    });

    if (assignees.length) {
      await this.notifyAssignees(campaign, assignees, members.length);
    }

    return campaign;
  }

  /** Staff/users who can be assigned to carry out a campaign. */
  getAssignees(branchId: string) {
    return this.prisma.user.findMany({
      where: {
        isActive: true,
        OR: [{ branchId }, { branchId: null }, { isSuperAdmin: true }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        roles: { select: { role: { select: { name: true } } } },
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });
  }

  private async notifyAssignees(
    campaign: {
      id: string;
      title: string;
      objective: string | null;
      type: FollowUpType;
      dueDate: Date | null;
      notes: string | null;
      branch: { name: string };
    },
    assignees: { id: string; firstName: string; lastName: string; email: string; phone: string | null }[],
    recipientCount: number,
  ) {
    const due = campaign.dueDate
      ? campaign.dueDate.toLocaleDateString('en-NG', { dateStyle: 'medium' })
      : 'Not set';
    const typeLabel = campaign.type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

    const smsBody = [
      `Follow-up assignment: ${campaign.title}`,
      `Due: ${due}`,
      `${recipientCount} person(s) to contact (${typeLabel}).`,
      campaign.objective ? `Goal: ${campaign.objective.slice(0, 80)}${campaign.objective.length > 80 ? '…' : ''}` : '',
      'Please log in to ChMS to begin.',
    ]
      .filter(Boolean)
      .join(' ');

    const emailSubject = `Follow-up assignment: ${campaign.title}`;
    const emailBody = [
      `Hello,`,
      ``,
      `You have been assigned as a responsible person for a follow-up campaign at ${campaign.branch.name}.`,
      ``,
      `Title: ${campaign.title}`,
      `Type: ${typeLabel}`,
      `Due date: ${due}`,
      `People to follow up: ${recipientCount}`,
      campaign.objective ? `Objective: ${campaign.objective}` : '',
      campaign.notes ? `Notes: ${campaign.notes}` : '',
      ``,
      `Please log in to the Church Management System to view the full contact list and record your follow-up activity.`,
      ``,
      `Blessings,`,
      `ChMS`,
    ]
      .filter((line) => line !== '')
      .join('\n');

    const notifiedIds: string[] = [];

    for (const user of assignees) {
      try {
        if (user.phone) {
          await this.sms.send(user.phone, smsBody);
        }
        await this.mail.send(user.email, emailSubject, emailBody);
        notifiedIds.push(user.id);
      } catch (err) {
        // Log but don't fail campaign creation if one notification fails
        this.logger.error(`Failed to notify assignee ${user.id}`, err);
      }
    }

    if (notifiedIds.length) {
      await this.prisma.followUpCampaignAssignee.updateMany({
        where: { campaignId: campaign.id, userId: { in: notifiedIds } },
        data: { notifiedAt: new Date() },
      });
    }
  }

  /** Suggest members based on follow-up type. */
  async getCandidates(type: FollowUpType, branchId: string) {
    const select = {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      status: true,
      membershipNumber: true,
    };

    switch (type) {
      case FollowUpType.FIRST_TIMER:
        return this.prisma.member.findMany({
          where: { branchId, isActive: true, status: { in: ['FIRST_TIMER', 'VISITOR'] } },
          select,
          orderBy: { firstName: 'asc' },
        });

      case FollowUpType.NEW_CONVERT:
        return this.prisma.member.findMany({
          where: { branchId, isActive: true, status: 'NEW_CONVERT' },
          select,
          orderBy: { firstName: 'asc' },
        });

      case FollowUpType.ABSENTEE:
        return this.getAbsenteeCandidates(branchId);

      default:
        return this.prisma.member.findMany({
          where: { branchId, isActive: true },
          select,
          orderBy: { firstName: 'asc' },
          take: 200,
        });
    }
  }

  private async getAbsenteeCandidates(branchId: string) {
    const recentSessions = await this.prisma.attendanceSession.findMany({
      where: { branchId },
      orderBy: { date: 'desc' },
      take: 3,
      select: { id: true },
    });

    if (!recentSessions.length) {
      return this.prisma.member.findMany({
        where: { branchId, isActive: true, status: { in: ['MEMBER', 'WORKER', 'LEADER'] } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          email: true,
          status: true,
          membershipNumber: true,
        },
        orderBy: { firstName: 'asc' },
      });
    }

    const attended = await this.prisma.attendanceRecord.findMany({
      where: { sessionId: { in: recentSessions.map((s) => s.id) } },
      select: { memberId: true },
    });
    const attendedIds = [...new Set(attended.map((a) => a.memberId))];

    return this.prisma.member.findMany({
      where: {
        branchId,
        isActive: true,
        status: { in: ['MEMBER', 'WORKER', 'LEADER'] },
        ...(attendedIds.length ? { id: { notIn: attendedIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        status: true,
        membershipNumber: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async getRecipient(campaignId: string, recipientId: string) {
    const rec = await this.prisma.followUpRecipient.findFirst({
      where: { id: recipientId, campaignId },
      include: {
        member: memberSel,
        campaign: { select: { id: true, title: true, type: true, objective: true, dueDate: true } },
      },
    });
    if (!rec) throw new NotFoundException('Recipient not found');

    const interactions = rec.memberId
      ? await this.listInteractionsForMember(rec.memberId)
      : [];

    return { ...rec, interactions };
  }

  private async logInteraction(params: {
    memberId: string;
    note: string;
    channel: 'NOTE' | 'SMS' | 'EMAIL' | 'STATUS';
    performedById?: string;
    campaignId?: string;
    recipientId?: string;
  }) {
    return this.prisma.followUpInteraction.create({
      data: {
        memberId: params.memberId,
        note: params.note,
        channel: params.channel,
        performedById: params.performedById,
        campaignId: params.campaignId,
        recipientId: params.recipientId,
      },
      include: {
        performer: { select: { id: true, firstName: true, lastName: true } },
        campaign: { select: { id: true, title: true, type: true } },
      },
    });
  }

  async updateRecipient(
    campaignId: string,
    recipientId: string,
    dto: UpdateFollowUpRecipientDto,
    userId?: string,
  ) {
    const rec = await this.getRecipient(campaignId, recipientId);
    const data: Prisma.FollowUpRecipientUpdateInput = {
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    };
    if (dto.status === FollowUpRecipientStatus.COMPLETED) {
      data.completedAt = new Date();
    }
    if (dto.status === FollowUpRecipientStatus.CONTACTED) {
      data.contactedAt = new Date();
    }

    const updated = await this.prisma.followUpRecipient.update({
      where: { id: recipientId },
      data,
      include: { member: memberSel },
    });

    if (rec.memberId) {
      if (dto.note !== undefined && dto.note.trim() && dto.note !== rec.note) {
        await this.logInteraction({
          memberId: rec.memberId,
          note: dto.note.trim(),
          channel: 'NOTE',
          performedById: userId,
          campaignId,
          recipientId,
        });
      }
      if (dto.status !== undefined && dto.status !== rec.status) {
        await this.logInteraction({
          memberId: rec.memberId,
          note: `Status updated to ${dto.status.replace(/_/g, ' ').toLowerCase()}`,
          channel: 'STATUS',
          performedById: userId,
          campaignId,
          recipientId,
        });
      }
    }

    await this.syncCampaignStatus(campaignId);
    return updated;
  }

  async sendSms(
    campaignId: string,
    recipientId: string,
    dto: SendFollowUpMessageDto,
    userId?: string,
  ) {
    const rec = await this.getRecipient(campaignId, recipientId);
    const phone = rec.contactPhone ?? rec.member?.phone;
    if (!phone) throw new BadRequestException('No phone number for this contact');

    const body =
      dto.message ??
      `Hello ${rec.contactName ?? 'there'}, this is a follow-up from church regarding "${rec.campaign.title}". God bless you.`;

    await this.sms.send(phone, body);

    if (rec.memberId) {
      await this.logInteraction({
        memberId: rec.memberId,
        note: body,
        channel: 'SMS',
        performedById: userId,
        campaignId,
        recipientId,
      });
    }

    return this.updateRecipient(campaignId, recipientId, {
      status: FollowUpRecipientStatus.CONTACTED,
    }, userId);
  }

  async sendEmail(
    campaignId: string,
    recipientId: string,
    dto: SendFollowUpMessageDto,
    userId?: string,
  ) {
    const rec = await this.getRecipient(campaignId, recipientId);
    const email = rec.contactEmail ?? rec.member?.email;
    if (!email) throw new BadRequestException('No email for this contact');

    const subject = dto.subject ?? `Follow-up: ${rec.campaign.title}`;
    const body =
      dto.message ??
      `Dear ${rec.contactName ?? 'friend'},\n\nWe are following up with you regarding "${rec.campaign.title}".\n\nBlessings,\nYour Church`;

    await this.mail.send(email, subject, body);

    if (rec.memberId) {
      await this.logInteraction({
        memberId: rec.memberId,
        note: `Subject: ${subject}\n\n${body}`,
        channel: 'EMAIL',
        performedById: userId,
        campaignId,
        recipientId,
      });
    }

    return this.updateRecipient(campaignId, recipientId, {
      status: FollowUpRecipientStatus.CONTACTED,
    }, userId);
  }

  private async syncCampaignStatus(campaignId: string) {
    const recipients = await this.prisma.followUpRecipient.findMany({
      where: { campaignId },
      select: { status: true },
    });
    if (!recipients.length) return;

    const allDone = recipients.every(
      (r) => r.status === FollowUpRecipientStatus.COMPLETED || r.status === FollowUpRecipientStatus.SKIPPED,
    );
    const anyStarted = recipients.some(
      (r) => r.status !== FollowUpRecipientStatus.PENDING,
    );

    await this.prisma.followUpCampaign.update({
      where: { id: campaignId },
      data: {
        status: allDone
          ? FollowUpStatus.COMPLETED
          : anyStarted
            ? FollowUpStatus.IN_PROGRESS
            : FollowUpStatus.OPEN,
      },
    });
  }

  /** Follow-up campaigns this member appears in. */
  listForMember(memberId: string) {
    return this.prisma.followUpRecipient.findMany({
      where: { memberId },
      orderBy: { createdAt: 'desc' },
      include: {
        campaign: {
          select: { id: true, title: true, type: true, dueDate: true, status: true },
        },
      },
    });
  }

  /** Chronological log of all follow-up conversations and contacts. */
  async listInteractionsForMember(memberId: string) {
    const [interactions, recipients] = await Promise.all([
      this.prisma.followUpInteraction.findMany({
        where: { memberId },
        orderBy: { createdAt: 'desc' },
        include: {
          performer: { select: { id: true, firstName: true, lastName: true } },
          campaign: { select: { id: true, title: true, type: true } },
        },
      }),
      this.prisma.followUpRecipient.findMany({
        where: { memberId, note: { not: null } },
        include: {
          campaign: { select: { id: true, title: true, type: true } },
        },
      }),
    ]);

    const loggedRecipientIds = new Set(
      interactions.map((i) => i.recipientId).filter(Boolean),
    );

    const legacy = recipients
      .filter((r) => r.note?.trim() && !loggedRecipientIds.has(r.id))
      .map((r) => ({
        id: `legacy-${r.id}`,
        memberId,
        campaignId: r.campaignId,
        recipientId: r.id,
        note: r.note!.trim(),
        channel: 'NOTE',
        performedById: null,
        createdAt: r.contactedAt ?? r.updatedAt,
        performer: null,
        campaign: r.campaign,
      }));

    return [...interactions, ...legacy].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  async sendMemberSms(memberId: string, dto: SendFollowUpMessageDto, userId?: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.phone) throw new BadRequestException('No phone number for this member');

    const body =
      dto.message ??
      `Hello ${member.firstName}, this is a follow-up from your church. God bless you.`;

    await this.sms.send(member.phone, body);
    await this.logInteraction({
      memberId,
      note: body,
      channel: 'SMS',
      performedById: userId,
    });

    return { success: true };
  }

  async sendMemberEmail(memberId: string, dto: SendFollowUpMessageDto, userId?: string) {
    const member = await this.prisma.member.findUnique({ where: { id: memberId } });
    if (!member) throw new NotFoundException('Member not found');
    if (!member.email) throw new BadRequestException('No email for this member');

    const subject = dto.subject ?? 'Follow-up from your church';
    const body =
      dto.message ??
      `Dear ${member.firstName},\n\nWe are following up with you. Please let us know if you need anything.\n\nBlessings,\nYour Church`;

    await this.mail.send(member.email, subject, body);
    await this.logInteraction({
      memberId,
      note: `Subject: ${subject}\n\n${body}`,
      channel: 'EMAIL',
      performedById: userId,
    });

    return { success: true };
  }

  async removeCampaign(id: string) {
    await this.getCampaign(id);
    await this.prisma.followUpCampaign.delete({ where: { id } });
    return { success: true };
  }
}
