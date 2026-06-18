import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate, skipTake } from '../common/pagination';
import {
  CreateLifeEventDto,
  CreateMemberDto,
  MemberQueryDto,
  UpdateMemberDto,
} from './dto/member.dto';

const listSelect = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  membershipNumber: true,
  gender: true,
  phone: true,
  email: true,
  status: true,
  pastoralRole: true,
  photoUrl: true,
  isActive: true,
  joinedAt: true,
  branch: { select: { id: true, name: true, code: true } },
} satisfies Prisma.MemberSelect;

function toDate(value?: string | null): Date | undefined {
  return value ? new Date(value) : undefined;
}

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateMembershipNumber(branchId: string): Promise<string> {
    const branch = await this.prisma.branch.findUnique({
      where: { id: branchId },
      select: { code: true },
    });
    const count = await this.prisma.member.count({ where: { branchId } });
    const code = branch?.code ?? 'MEM';
    return `${code}-${String(count + 1).padStart(4, '0')}`;
  }

  async findMany(query: MemberQueryDto) {
    const { page = 1, pageSize = 20, search, branchId, status, departmentId, pastoralRole, pastorsOnly } = query;

    const where: Prisma.MemberWhereInput = {
      ...(branchId ? { branchId } : {}),
      ...(status ? { status } : {}),
      ...(pastoralRole ? { pastoralRole } : {}),
      ...(pastorsOnly ? { pastoralRole: { not: 'NONE' } } : {}),
      ...(departmentId ? { departments: { some: { departmentId } } } : {}),
      ...(search
        ? {
            OR: [
              { firstName: { contains: search } },
              { lastName: { contains: search } },
              { email: { contains: search } },
              { phone: { contains: search } },
              { membershipNumber: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        select: listSelect,
        orderBy: { createdAt: 'desc' },
        ...skipTake(page, pageSize),
      }),
      this.prisma.member.count({ where }),
    ]);

    return paginate(rows, total, page, pageSize);
  }

  async findOne(id: string) {
    const member = await this.prisma.member.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, code: true } },
        household: { select: { id: true, name: true } },
        departments: {
          include: { department: { select: { id: true, name: true } } },
        },
        lifeEvents: { orderBy: { eventDate: 'desc' } },
      },
    });
    if (!member) throw new NotFoundException('Member not found');
    return member;
  }

  async create(dto: CreateMemberDto) {
    const { departmentIds, ...rest } = dto;
    const membershipNumber = await this.generateMembershipNumber(dto.branchId);

    return this.prisma.member.create({
      data: {
        ...rest,
        membershipNumber,
        dateOfBirth: toDate(dto.dateOfBirth),
        joinedAt: toDate(dto.joinedAt) ?? new Date(),
        baptismDate: toDate(dto.baptismDate),
        departments: departmentIds?.length
          ? { create: departmentIds.map((departmentId) => ({ departmentId })) }
          : undefined,
      },
      include: { departments: { include: { department: true } } },
    });
  }

  async update(id: string, dto: UpdateMemberDto) {
    await this.findOne(id);
    const { departmentIds, dateOfBirth, joinedAt, baptismDate, ...rest } = dto;

    if (departmentIds) {
      await this.prisma.memberDepartment.deleteMany({ where: { memberId: id } });
    }

    return this.prisma.member.update({
      where: { id },
      data: {
        ...rest,
        ...(dateOfBirth !== undefined ? { dateOfBirth: toDate(dateOfBirth) } : {}),
        ...(joinedAt !== undefined ? { joinedAt: toDate(joinedAt) } : {}),
        ...(baptismDate !== undefined ? { baptismDate: toDate(baptismDate) } : {}),
        ...(departmentIds
          ? { departments: { create: departmentIds.map((departmentId) => ({ departmentId })) } }
          : {}),
      },
      include: { departments: { include: { department: true } } },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.member.delete({ where: { id } });
    return { success: true };
  }

  async stats(branchId?: string) {
    const where: Prisma.MemberWhereInput = branchId ? { branchId } : {};
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [total, byStatus, byGender, byPastoralRole, newThisMonth] = await Promise.all([
      this.prisma.member.count({ where }),
      this.prisma.member.groupBy({ by: ['status'], where, _count: true }),
      this.prisma.member.groupBy({ by: ['gender'], where, _count: true }),
      this.prisma.member.groupBy({ by: ['pastoralRole'], where, _count: true }),
      this.prisma.member.count({ where: { ...where, joinedAt: { gte: startOfMonth } } }),
    ]);

    return {
      total,
      newThisMonth,
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count })),
      byGender: byGender.map((g) => ({ gender: g.gender ?? 'UNKNOWN', count: g._count })),
      byPastoralRole: byPastoralRole.map((p) => ({ pastoralRole: p.pastoralRole, count: p._count })),
    };
  }

  async addLifeEvent(memberId: string, dto: CreateLifeEventDto) {
    await this.findOne(memberId);
    return this.prisma.memberLifeEvent.create({
      data: {
        memberId,
        title: dto.title,
        type: dto.type as Prisma.MemberLifeEventCreateInput['type'],
        eventDate: new Date(dto.eventDate),
        description: dto.description,
      },
    });
  }

  async removeLifeEvent(memberId: string, eventId: string) {
    await this.prisma.memberLifeEvent.deleteMany({ where: { id: eventId, memberId } });
    return { success: true };
  }

  /** Bulk-import members from CSV text. */
  async importCsv(csvText: string, defaultBranchId?: string) {
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return { created: 0, skipped: 0, errors: [{ row: 0, message: 'CSV must have a header row and at least one data row' }] };
    }

    const header = this.parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, ''));
    const col = (row: string[], name: string) => {
      const i = header.indexOf(name);
      return i >= 0 ? row[i]?.trim() : '';
    };

    const branches = await this.prisma.branch.findMany({ select: { id: true, code: true } });
    const branchByCode = new Map(branches.map((b) => [b.code.toLowerCase(), b.id]));

    let created = 0;
    let skipped = 0;
    const errors: { row: number; message: string }[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCsvLine(lines[i]);
      const firstName = col(row, 'firstname');
      const lastName = col(row, 'lastname');
      if (!firstName || !lastName) {
        errors.push({ row: i + 1, message: 'firstName and lastName are required' });
        skipped++;
        continue;
      }

      const branchCode = col(row, 'branchcode') || col(row, 'branch');
      let branchId = defaultBranchId;
      if (branchCode) {
        branchId = branchByCode.get(branchCode.toLowerCase());
      }
      if (!branchId) {
        errors.push({ row: i + 1, message: `Branch not found: ${branchCode || '(none)'}` });
        skipped++;
        continue;
      }

      try {
        const membershipNumber = await this.generateMembershipNumber(branchId);
        const pastoralRaw = col(row, 'pastoralrole') || col(row, 'pastor');
        let pastoralRole: Prisma.MemberCreateInput['pastoralRole'] = 'NONE';
        if (/^pastor$/i.test(pastoralRaw) || /^yes$/i.test(pastoralRaw)) pastoralRole = 'PASTOR';
        else if (/assistant/i.test(pastoralRaw)) pastoralRole = 'ASSISTANT_PASTOR';

        await this.prisma.member.create({
          data: {
            branchId,
            firstName,
            lastName,
            middleName: col(row, 'middlename') || undefined,
            email: col(row, 'email') || undefined,
            phone: col(row, 'phone') || undefined,
            gender: this.parseGender(col(row, 'gender')),
            status: this.parseMemberStatus(col(row, 'status')),
            pastoralRole,
            city: col(row, 'city') || undefined,
            state: col(row, 'state') || undefined,
            address: col(row, 'address') || undefined,
            occupation: col(row, 'occupation') || undefined,
            membershipNumber,
            joinedAt: new Date(),
          },
        });
        created++;
      } catch (err) {
        errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : 'Import failed',
        });
        skipped++;
      }
    }

    return { created, skipped, errors };
  }

  private parseCsvLine(line: string): string[] {
    const out: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim());
  }

  private parseGender(value: string): Prisma.MemberCreateInput['gender'] | undefined {
    if (!value) return undefined;
    const v = value.toUpperCase();
    if (v === 'M' || v === 'MALE') return 'MALE';
    if (v === 'F' || v === 'FEMALE') return 'FEMALE';
    return undefined;
  }

  private parseMemberStatus(value: string): Prisma.MemberCreateInput['status'] {
    if (!value) return 'MEMBER';
    const v = value.toUpperCase().replace(/\s+/g, '_');
    const allowed = ['VISITOR', 'FIRST_TIMER', 'NEW_CONVERT', 'MEMBER', 'WORKER', 'LEADER', 'INACTIVE'];
    return allowed.includes(v) ? (v as Prisma.MemberCreateInput['status']) : 'MEMBER';
  }
}
