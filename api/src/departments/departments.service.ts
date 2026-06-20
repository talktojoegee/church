import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentMemberRole, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';
import {
  AssignDepartmentRoleDto,
  CreateDepartmentDto,
  PublishDepartmentAnnouncementDto,
  UpdateDepartmentDto,
} from './dto/department.dto';

const LEADERSHIP_ROLES: DepartmentMemberRole[] = [
  DepartmentMemberRole.HOD,
  DepartmentMemberRole.ASSISTANT,
  DepartmentMemberRole.SECRETARY,
];

type LeadershipMember = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  membershipNumber: string | null;
};

type MemberDepartmentRow = {
  role: DepartmentMemberRole;
  member: LeadershipMember;
};

function buildLeadership(
  members: MemberDepartmentRow[],
  leader: LeadershipMember | null,
) {
  const byRole = (role: DepartmentMemberRole) =>
    members.find((m) => m.role === role)?.member ?? null;

  return {
    hod: byRole(DepartmentMemberRole.HOD) ?? leader,
    assistant: byRole(DepartmentMemberRole.ASSISTANT),
    secretary: byRole(DepartmentMemberRole.SECRETARY),
  };
}

const memberSelect = {
  id: true,
  firstName: true,
  lastName: true,
  phone: true,
  email: true,
  photoUrl: true,
  membershipNumber: true,
} satisfies Prisma.MemberSelect;

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  async findMany(branchId?: string) {
    const where: Prisma.DepartmentWhereInput = branchId ? { branchId } : {};
    const rows = await this.prisma.department.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        leader: { select: memberSelect },
        branch: { select: { id: true, name: true } },
        parent: { select: { id: true, name: true } },
        members: {
          where: { role: DepartmentMemberRole.HOD },
          take: 1,
          include: { member: { select: memberSelect } },
        },
        _count: { select: { members: true, children: true } },
      },
    });

    return rows.map((d) => ({
      ...d,
      hod: d.members[0]?.member ?? d.leader ?? null,
    }));
  }

  async findOne(id: string) {
    const dept = await this.prisma.department.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true } },
        leader: { select: memberSelect },
        parent: { select: { id: true, name: true } },
        members: {
          orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
          include: { member: { select: memberSelect } },
        },
        announcements: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: { select: { members: true, children: true } },
      },
    });
    if (!dept) throw new NotFoundException('Department not found');

    const leadership = buildLeadership(dept.members, dept.leader);

    return { ...dept, leadership };
  }

  async create(dto: CreateDepartmentDto) {
    await this.assertUniqueName(dto.branchId, dto.name);
    return this.prisma.department.create({ data: dto });
  }

  async update(id: string, dto: UpdateDepartmentDto) {
    const dept = await this.findOne(id);
    if (dto.name) {
      await this.assertUniqueName(dept.branch.id, dto.name, id);
    }
    return this.prisma.department.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.memberDepartment.deleteMany({ where: { departmentId: id } }),
      this.prisma.departmentAnnouncement.deleteMany({ where: { departmentId: id } }),
      this.prisma.department.updateMany({ where: { parentId: id }, data: { parentId: null } }),
      this.prisma.department.delete({ where: { id } }),
    ]);
    return { success: true };
  }

  private async assertUniqueName(branchId: string, name: string, excludeId?: string) {
    const normalized = name.trim().toLowerCase();
    const peers = await this.prisma.department.findMany({
      where: { branchId },
      select: { id: true, name: true },
    });
    const clash = peers.find(
      (p) => p.id !== excludeId && p.name.trim().toLowerCase() === normalized,
    );
    if (clash) {
      throw new ConflictException(
        `A department named "${name.trim()}" already exists in this branch`,
      );
    }
  }

  async setMembers(id: string, memberIds: string[]) {
    await this.findOne(id);
    const existing = await this.prisma.memberDepartment.findMany({
      where: { departmentId: id },
      select: { memberId: true, role: true },
    });
    const roleByMember = new Map(existing.map((e) => [e.memberId, e.role]));

    await this.prisma.memberDepartment.deleteMany({ where: { departmentId: id } });
    if (memberIds.length) {
      await this.prisma.memberDepartment.createMany({
        data: memberIds.map((memberId) => ({
          departmentId: id,
          memberId,
          role: roleByMember.get(memberId) ?? DepartmentMemberRole.MEMBER,
        })),
        skipDuplicates: true,
      });
    }

    await this.syncLeaderFromHod(id);
    return this.findOne(id);
  }

  async addMember(departmentId: string, memberId: string) {
    await this.findOne(departmentId);
    await this.prisma.memberDepartment.upsert({
      where: { memberId_departmentId: { memberId, departmentId } },
      create: { memberId, departmentId, role: DepartmentMemberRole.MEMBER },
      update: {},
    });
    return this.findOne(departmentId);
  }

  async removeMember(departmentId: string, memberId: string) {
    const dept = await this.findOne(departmentId);
    const row = dept.members.find((m) => m.member.id === memberId);
    if (row && LEADERSHIP_ROLES.includes(row.role)) {
      if (row.role === DepartmentMemberRole.HOD) {
        await this.prisma.department.update({
          where: { id: departmentId },
          data: { leaderId: null },
        });
      }
    }
    await this.prisma.memberDepartment.deleteMany({
      where: { departmentId, memberId },
    });
    return this.findOne(departmentId);
  }

  async assignRole(departmentId: string, memberId: string, dto: AssignDepartmentRoleDto) {
    const dept = await this.findOne(departmentId);
    const isMember = dept.members.some((m) => m.member.id === memberId);

    await this.prisma.$transaction(async (tx) => {
      if (!isMember) {
        if (dto.role === DepartmentMemberRole.MEMBER) {
          throw new BadRequestException('Member is not in this department');
        }
        await tx.memberDepartment.create({
          data: { departmentId, memberId, role: dto.role },
        });
      }

      if (LEADERSHIP_ROLES.includes(dto.role)) {
        await tx.memberDepartment.updateMany({
          where: { departmentId, role: dto.role, memberId: { not: memberId } },
          data: { role: DepartmentMemberRole.MEMBER },
        });
      }

      if (isMember) {
        await tx.memberDepartment.update({
          where: { memberId_departmentId: { memberId, departmentId } },
          data: { role: dto.role },
        });
      }

      if (dto.role === DepartmentMemberRole.HOD) {
        await tx.department.update({
          where: { id: departmentId },
          data: { leaderId: memberId },
        });
      } else if (dept.leader?.id === memberId || dept.leadership?.hod?.id === memberId) {
        await tx.department.update({
          where: { id: departmentId },
          data: { leaderId: null },
        });
      }
    });

    if (
      dto.role !== DepartmentMemberRole.HOD &&
      (dept.leader?.id === memberId || dept.leadership?.hod?.id === memberId)
    ) {
      await this.syncLeaderFromHod(departmentId);
    }

    return this.findOne(departmentId);
  }

  async publishAnnouncement(
    departmentId: string,
    dto: PublishDepartmentAnnouncementDto,
    userId?: string,
  ) {
    const dept = await this.findOne(departmentId);
    const channel = dto.channel ?? 'BOTH';
    const recipients = dept.members.map((m) => m.member);
    if (!recipients.length) {
      throw new BadRequestException('No members in this department to notify');
    }

    const subject = `${dept.name}: ${dto.title}`;
    const body = `${dto.title}\n\n${dto.message}\n\n— ${dept.name}, ${dept.branch.name}`;

    let sent = 0;
    for (const m of recipients) {
      try {
        if ((channel === 'SMS' || channel === 'BOTH') && m.phone) {
          await this.sms.send(m.phone, body.slice(0, 480));
        }
        if ((channel === 'EMAIL' || channel === 'BOTH') && m.email) {
          await this.mail.send(m.email, subject, body);
        }
        if (m.phone || m.email) sent++;
      } catch {
        // continue notifying others
      }
    }

    const record = await this.prisma.departmentAnnouncement.create({
      data: {
        departmentId,
        title: dto.title,
        message: dto.message,
        channel,
        recipientCount: sent,
        sentById: userId,
      },
    });

    return { ...record, attempted: recipients.length, sent };
  }

  private async syncLeaderFromHod(departmentId: string) {
    const hod = await this.prisma.memberDepartment.findFirst({
      where: { departmentId, role: DepartmentMemberRole.HOD },
      select: { memberId: true },
    });
    await this.prisma.department.update({
      where: { id: departmentId },
      data: { leaderId: hod?.memberId ?? null },
    });
  }
}
