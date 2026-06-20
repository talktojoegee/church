import { Injectable, NotFoundException } from '@nestjs/common';
import { GroupActivityType, Prisma } from '@prisma/client';
import type { AuthUser } from '@chms/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateGroupAnnouncementDto,
  CreateGroupDto,
  CreateGroupMeetingDto,
  CreateGroupNoteDto,
  UpdateGroupDto,
} from './dto/group.dto';

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  photoUrl: true,
  status: true,
  membershipNumber: true,
} as const;

const activityInclude = {
  meeting: {
    include: {
      attendance: {
        include: {
          member: { select: memberSelect },
        },
      },
    },
  },
  announcement: true,
} as const;

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private actorName(user?: AuthUser) {
    return user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
  }

  private async logActivity(
    groupId: string,
    type: GroupActivityType,
    title: string,
    opts?: {
      description?: string;
      metadata?: Prisma.InputJsonValue;
      user?: AuthUser;
      meetingId?: string;
      announcementId?: string;
    },
  ) {
    await this.prisma.groupActivity.create({
      data: {
        groupId,
        type,
        title,
        description: opts?.description,
        metadata: opts?.metadata,
        actorId: opts?.user?.id,
        actorName: this.actorName(opts?.user),
        meetingId: opts?.meetingId,
        announcementId: opts?.announcementId,
      },
    });
  }

  private groupInclude = {
    leader: { select: memberSelect },
    branch: { select: { id: true, name: true } },
    members: {
      orderBy: { joinedAt: 'asc' as const },
      include: { member: { select: memberSelect } },
    },
    activities: {
      orderBy: { createdAt: 'desc' as const },
      take: 50,
      include: activityInclude,
    },
    _count: { select: { members: true, meetings: true, activities: true } },
  };

  async findMany(branchId?: string) {
    const where: Prisma.GroupWhereInput = branchId ? { branchId } : {};
    return this.prisma.group.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        leader: { select: memberSelect },
        branch: { select: { id: true, name: true } },
        _count: { select: { members: true, meetings: true } },
      },
    });
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      include: this.groupInclude,
    });
    if (!group) throw new NotFoundException('Group not found');
    return group;
  }

  async findActivity(groupId: string) {
    await this.findOne(groupId);
    return this.prisma.groupActivity.findMany({
      where: { groupId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: activityInclude,
    });
  }

  create(dto: CreateGroupDto) {
    return this.prisma.group.create({ data: dto });
  }

  async update(id: string, dto: UpdateGroupDto, user?: AuthUser) {
    const before = await this.findOne(id);
    await this.prisma.group.update({ where: { id }, data: dto });

    if (dto.leaderId !== undefined && dto.leaderId !== before.leaderId) {
      const newLeader = dto.leaderId
        ? await this.prisma.member.findUnique({
            where: { id: dto.leaderId },
            select: { firstName: true, lastName: true },
          })
        : null;
      const oldLeader = before.leader;
      await this.logActivity(id, GroupActivityType.LEADER_CHANGED, 'Group leader changed', {
        description: newLeader
          ? `${newLeader.firstName} ${newLeader.lastName} is now the group leader`
          : 'Group leader was removed',
        metadata: {
          oldLeaderId: before.leaderId,
          oldLeaderName: oldLeader ? `${oldLeader.firstName} ${oldLeader.lastName}` : null,
          newLeaderId: dto.leaderId,
          newLeaderName: newLeader ? `${newLeader.firstName} ${newLeader.lastName}` : null,
        },
        user,
      });
    }

    const fieldLabels: Record<string, string> = {
      name: 'Name',
      category: 'Category',
      description: 'Description',
      meetingDay: 'Meeting day',
      meetingTime: 'Meeting time',
      location: 'Location',
      isActive: 'Status',
    };
    const changes = Object.entries(dto)
      .filter(([key, value]) => key !== 'leaderId' && value !== undefined)
      .map(([key, value]) => {
        const label = fieldLabels[key] ?? key;
        if (key === 'isActive') {
          return `${label}: ${value ? 'Active' : 'Inactive'}`;
        }
        return `${label} updated`;
      });

    if (changes.length) {
      await this.logActivity(id, GroupActivityType.GROUP_UPDATED, 'Group details updated', {
        description: changes.join(' · '),
        metadata: { fields: Object.keys(dto).filter((k) => k !== 'leaderId') },
        user,
      });
    }

    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.groupActivity.deleteMany({ where: { groupId: id } }),
      this.prisma.groupMeetingAttendance.deleteMany({
        where: { meeting: { groupId: id } },
      }),
      this.prisma.groupMeeting.deleteMany({ where: { groupId: id } }),
      this.prisma.groupAnnouncement.deleteMany({ where: { groupId: id } }),
      this.prisma.groupMember.deleteMany({ where: { groupId: id } }),
      this.prisma.group.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  async addMember(groupId: string, memberId: string, user?: AuthUser) {
    await this.findOne(groupId);
    const member = await this.prisma.member.findUnique({
      where: { id: memberId },
      select: { firstName: true, lastName: true },
    });
    if (!member) throw new NotFoundException('Member not found');

    await this.prisma.groupMember.upsert({
      where: { groupId_memberId: { groupId, memberId } },
      create: { groupId, memberId },
      update: {},
    });

    await this.logActivity(groupId, GroupActivityType.MEMBER_JOINED, 'Member joined group', {
      description: `${member.firstName} ${member.lastName} was added to the group`,
      metadata: { memberId, memberName: `${member.firstName} ${member.lastName}` },
      user,
    });

    return this.findOne(groupId);
  }

  async removeMember(groupId: string, memberId: string, user?: AuthUser) {
    const group = await this.findOne(groupId);
    const row = group.members.find((m) => m.member.id === memberId);
    const memberName = row
      ? `${row.member.firstName} ${row.member.lastName}`
      : 'Member';

    if (group.leaderId === memberId) {
      await this.prisma.group.update({
        where: { id: groupId },
        data: { leaderId: null },
      });
    }
    await this.prisma.groupMember.deleteMany({ where: { groupId, memberId } });

    await this.logActivity(groupId, GroupActivityType.MEMBER_LEFT, 'Member left group', {
      description: `${memberName} was removed from the group`,
      metadata: { memberId, memberName },
      user,
    });

    return this.findOne(groupId);
  }

  async setMembers(id: string, memberIds: string[]) {
    await this.findOne(id);
    await this.prisma.groupMember.deleteMany({ where: { groupId: id } });
    if (memberIds.length) {
      await this.prisma.groupMember.createMany({
        data: memberIds.map((memberId) => ({ groupId: id, memberId })),
        skipDuplicates: true,
      });
    }
    return this.findOne(id);
  }

  async addNote(groupId: string, dto: CreateGroupNoteDto, user?: AuthUser) {
    await this.findOne(groupId);
    await this.logActivity(groupId, GroupActivityType.NOTE, dto.title, {
      description: dto.body,
      user,
    });
    return this.findActivity(groupId);
  }

  async logMeeting(groupId: string, dto: CreateGroupMeetingDto, user?: AuthUser) {
    const group = await this.findOne(groupId);
    const attendeeIds = dto.attendeeIds ?? [];
    const validIds = new Set(group.members.map((m) => m.member.id));
    const filtered = attendeeIds.filter((id) => validIds.has(id));

    const meeting = await this.prisma.groupMeeting.create({
      data: {
        groupId,
        title: dto.title,
        topic: dto.topic,
        heldAt: new Date(dto.heldAt),
        notes: dto.notes,
        createdById: user?.id,
        attendance: filtered.length
          ? {
              create: filtered.map((memberId) => ({ memberId, present: true })),
            }
          : undefined,
      },
    });

    await this.logActivity(groupId, GroupActivityType.MEETING_HELD, dto.title, {
      description: dto.notes ?? dto.topic ?? undefined,
      metadata: {
        topic: dto.topic,
        attendeeCount: filtered.length,
        totalMembers: group.members.length,
        heldAt: dto.heldAt,
      },
      user,
      meetingId: meeting.id,
    });

    return this.findOne(groupId);
  }

  async postAnnouncement(groupId: string, dto: CreateGroupAnnouncementDto, user?: AuthUser) {
    await this.findOne(groupId);

    const announcement = await this.prisma.groupAnnouncement.create({
      data: {
        groupId,
        title: dto.title,
        body: dto.body,
        createdById: user?.id,
      },
    });

    await this.logActivity(groupId, GroupActivityType.ANNOUNCEMENT, dto.title, {
      description: dto.body,
      user,
      announcementId: announcement.id,
    });

    return this.findOne(groupId);
  }
}
