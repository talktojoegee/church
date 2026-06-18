import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateEventDto,
  CreateOutreachDto,
  CreateOutreachTypeDto,
  OutreachQueryDto,
  AddOutreachImageDto,
  CreateSermonDto,
  CreateSermonSeriesDto,
  CreateTestimonyDto,
  CreateTestimonyCategoryDto,
  TestimonyQueryDto,
  RegisterEventDto,
  ReviewTestimonyDto,
  UpdateEventDto,
  UpdateOutreachDto,
  UpdateOutreachTypeDto,
  UpdateSermonDto,
  UpdateSermonSeriesDto,
  UpdateTestimonyDto,
  UpdateTestimonyCategoryDto,
} from './dto/content.dto';

const d = (v?: string) => (v ? new Date(v) : undefined);
const branchSel = { select: { id: true, name: true } };
const memberSel = { select: { id: true, firstName: true, lastName: true } };
const seriesSel = { select: { id: true, name: true, description: true } };
const categorySel = { select: { id: true, name: true, description: true } };
const outreachTypeSel = { select: { id: true, name: true, description: true } };
const sermonListInclude = {
  branch: branchSel,
  sermonSeries: seriesSel,
};
const testimonyInclude = {
  member: memberSel,
  testimonyCategory: categorySel,
};
const outreachInclude = {
  branch: branchSel,
  type: outreachTypeSel,
  images: { orderBy: { sortOrder: 'asc' as const } },
};

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ---------------- Sermons ----------------
  private buildSermonWhere(query: {
    branchId?: string;
    title?: string;
    search?: string;
    seriesId?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.SermonWhereInput {
    const where: Prisma.SermonWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    if (query.title?.trim()) {
      where.title = { contains: query.title.trim() };
    }

    if (query.seriesId) {
      where.seriesId = query.seriesId;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { speaker: { contains: q } },
        { sermonSeries: { name: { contains: q } } },
        { scripture: { contains: q } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.preachedAt = {};
      if (query.startDate) {
        where.preachedAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.preachedAt.lte = end;
      }
    }

    return where;
  }

  listSermons(query: {
    branchId?: string;
    title?: string;
    search?: string;
    seriesId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where = this.buildSermonWhere(query);
    return this.prisma.sermon.findMany({
      where,
      orderBy: { preachedAt: 'desc' },
      include: sermonListInclude,
    });
  }

  async sermonStats(query: {
    branchId?: string;
    title?: string;
    search?: string;
    seriesId?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where = this.buildSermonWhere(query);
    const seriesWhere: Prisma.SermonSeriesWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [total, published, withMedia, seriesCount] = await Promise.all([
      this.prisma.sermon.count({ where }),
      this.prisma.sermon.count({ where: { ...where, isPublished: true } }),
      this.prisma.sermon.count({
        where: {
          ...where,
          OR: [{ audioUrl: { not: null } }, { videoUrl: { not: null } }],
        },
      }),
      this.prisma.sermonSeries.count({ where: seriesWhere }),
    ]);

    return {
      total,
      published,
      drafts: total - published,
      withMedia,
      series: seriesCount,
    };
  }

  async getSermon(id: string) {
    const sermon = await this.prisma.sermon.findUnique({
      where: { id },
      include: sermonListInclude,
    });
    if (!sermon) throw new NotFoundException('Sermon not found');
    return sermon;
  }

  createSermon(dto: CreateSermonDto, userId?: string) {
    const { preachedAt, seriesId, ...rest } = dto;
    return this.prisma.sermon.create({
      data: {
        ...rest,
        ...(seriesId ? { seriesId } : {}),
        preachedAt: d(preachedAt),
        createdById: userId,
      },
      include: sermonListInclude,
    });
  }

  async updateSermon(id: string, dto: UpdateSermonDto) {
    await this.ensure('sermon', id);
    const { preachedAt, seriesId, ...rest } = dto;
    return this.prisma.sermon.update({
      where: { id },
      data: {
        ...rest,
        ...(seriesId !== undefined ? { seriesId: seriesId || null } : {}),
        ...(preachedAt ? { preachedAt: d(preachedAt) } : {}),
      },
      include: sermonListInclude,
    });
  }
  async removeSermon(id: string) {
    await this.ensure('sermon', id);
    await this.prisma.sermon.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Sermon series ----------------
  listSermonSeries(branchId?: string) {
    return this.prisma.sermonSeries.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      include: {
        branch: branchSel,
        _count: { select: { sermons: true } },
      },
    });
  }

  async sermonPlaylists(branchId?: string) {
    const series = await this.prisma.sermonSeries.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      include: {
        sermons: {
          orderBy: { preachedAt: 'asc' },
          select: {
            id: true,
            title: true,
            speaker: true,
            preachedAt: true,
            audioUrl: true,
            videoUrl: true,
            isPublished: true,
          },
        },
        _count: { select: { sermons: true } },
      },
    });

    return series.filter((s) => s._count.sermons > 0);
  }

  async getSermonSeries(id: string) {
    const series = await this.prisma.sermonSeries.findUnique({
      where: { id },
      include: {
        branch: branchSel,
        sermons: {
          orderBy: { preachedAt: 'asc' },
          include: { branch: branchSel },
        },
      },
    });
    if (!series) throw new NotFoundException('Sermon series not found');
    return series;
  }

  createSermonSeries(dto: CreateSermonSeriesDto) {
    return this.prisma.sermonSeries.create({
      data: dto,
      include: { branch: branchSel, _count: { select: { sermons: true } } },
    });
  }

  async updateSermonSeries(id: string, dto: UpdateSermonSeriesDto) {
    await this.ensure('sermonSeries', id);
    return this.prisma.sermonSeries.update({
      where: { id },
      data: dto,
      include: { branch: branchSel, _count: { select: { sermons: true } } },
    });
  }

  async removeSermonSeries(id: string) {
    await this.ensure('sermonSeries', id);
    await this.prisma.sermonSeries.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Testimonies ----------------
  private buildTestimonyWhere(query: {
    status?: string;
    categoryId?: string;
    search?: string;
  }): Prisma.TestimonyWhereInput {
    const where: Prisma.TestimonyWhereInput = {};

    if (query.status) {
      where.status = query.status as Prisma.TestimonyWhereInput['status'];
    }

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      const parts = q.split(/\s+/).filter(Boolean);
      const or: Prisma.TestimonyWhereInput[] = [
        { title: { contains: q } },
        { body: { contains: q } },
        { authorName: { contains: q } },
        { testimonyCategory: { name: { contains: q } } },
        { member: { firstName: { contains: q } } },
        { member: { lastName: { contains: q } } },
      ];
      if (parts.length >= 2) {
        or.push({
          member: {
            AND: [
              { firstName: { contains: parts[0] } },
              { lastName: { contains: parts[parts.length - 1] } },
            ],
          },
        });
      }
      where.OR = or;
    }

    return where;
  }

  listTestimonies(query: {
    status?: string;
    categoryId?: string;
    search?: string;
  } = {}) {
    const where = this.buildTestimonyWhere(query);
    return this.prisma.testimony.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: testimonyInclude,
    });
  }

  async testimonyStats(query: {
    status?: string;
    categoryId?: string;
    search?: string;
  } = {}) {
    const where = this.buildTestimonyWhere(query);

    const [total, pending, approved, featured, categories] = await Promise.all([
      this.prisma.testimony.count({ where }),
      this.prisma.testimony.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.testimony.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.testimony.count({ where: { ...where, isFeatured: true } }),
      this.prisma.testimonyCategory.count(),
    ]);

    return { total, pending, approved, featured, categories };
  }

  async getTestimony(id: string) {
    const testimony = await this.prisma.testimony.findUnique({
      where: { id },
      include: testimonyInclude,
    });
    if (!testimony) throw new NotFoundException('Testimony not found');
    return testimony;
  }

  async createTestimony(dto: CreateTestimonyDto) {
    const { occurredAt, categoryId, ...rest } = dto;
    const testimony = await this.prisma.testimony.create({
      data: {
        ...rest,
        ...(categoryId ? { categoryId } : {}),
        occurredAt: d(occurredAt),
      },
      include: testimonyInclude,
    });
    const reviewerIds = await this.notifications.findUserIdsWithPermission('content.testimony.manage');
    if (reviewerIds.length > 0) {
      await this.notifications.notifyUsers(reviewerIds, {
        title: 'New testimony to review',
        body: testimony.title,
        type: 'TESTIMONY',
        link: `/testimonies/${testimony.id}`,
      });
    }
    return testimony;
  }

  async updateTestimony(id: string, dto: UpdateTestimonyDto) {
    await this.ensure('testimony', id);
    const { occurredAt, categoryId, ...rest } = dto;
    return this.prisma.testimony.update({
      where: { id },
      data: {
        ...rest,
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(occurredAt ? { occurredAt: d(occurredAt) } : {}),
      },
      include: testimonyInclude,
    });
  }

  async reviewTestimony(id: string, dto: ReviewTestimonyDto, userId?: string) {
    await this.ensure('testimony', id);
    return this.prisma.testimony.update({
      where: { id },
      data: { status: dto.status, reviewedById: userId },
      include: testimonyInclude,
    });
  }

  async removeTestimony(id: string) {
    await this.ensure('testimony', id);
    await this.prisma.testimony.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Testimony categories ----------------
  listTestimonyCategories() {
    return this.prisma.testimonyCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { testimonies: true } } },
    });
  }

  async getTestimonyCategory(id: string) {
    const category = await this.prisma.testimonyCategory.findUnique({
      where: { id },
      include: {
        testimonies: {
          orderBy: { createdAt: 'desc' },
          include: testimonyInclude,
        },
        _count: { select: { testimonies: true } },
      },
    });
    if (!category) throw new NotFoundException('Testimony category not found');
    return category;
  }

  createTestimonyCategory(dto: CreateTestimonyCategoryDto) {
    return this.prisma.testimonyCategory.create({
      data: dto,
      include: { _count: { select: { testimonies: true } } },
    });
  }

  async updateTestimonyCategory(id: string, dto: UpdateTestimonyCategoryDto) {
    await this.ensure('testimonyCategory', id);
    return this.prisma.testimonyCategory.update({
      where: { id },
      data: dto,
      include: { _count: { select: { testimonies: true } } },
    });
  }

  async removeTestimonyCategory(id: string) {
    await this.ensure('testimonyCategory', id);
    await this.prisma.testimonyCategory.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- Events ----------------
  private buildEventWhere(query: {
    branchId?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }): Prisma.EventWhereInput {
    const where: Prisma.EventWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: query.status as Prisma.EventWhereInput['status'] } : {}),
    };

    if (query.search?.trim()) {
      where.OR = [
        { title: { contains: query.search.trim() } },
        { location: { contains: query.search.trim() } },
        { description: { contains: query.search.trim() } },
      ];
    }

    if (query.startDate || query.endDate) {
      where.startAt = {};
      if (query.startDate) {
        where.startAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        const end = new Date(query.endDate);
        end.setHours(23, 59, 59, 999);
        where.startAt.lte = end;
      }
    }

    return where;
  }

  async listEvents(query: {
    branchId?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where = this.buildEventWhere(query);
    return this.prisma.event.findMany({
      where,
      orderBy: { startAt: 'desc' },
      include: { branch: branchSel, _count: { select: { registrations: true } } },
    });
  }

  async eventStats(query: {
    branchId?: string;
    search?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  } = {}) {
    const where = this.buildEventWhere(query);
    const now = new Date();

    const [total, published, upcoming, draft, registrations] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.count({ where: { ...where, status: 'PUBLISHED' } }),
      this.prisma.event.count({
        where: { ...where, status: 'PUBLISHED', startAt: { gte: now } },
      }),
      this.prisma.event.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.eventRegistration.count({
        where: { event: where },
      }),
    ]);

    return { total, published, upcoming, draft, registrations };
  }
  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        branch: branchSel,
        registrations: { include: { member: memberSel }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }
  createEvent(dto: CreateEventDto, userId?: string) {
    const { startAt, endAt, ...rest } = dto;
    return this.prisma.event.create({ data: { ...rest, startAt: new Date(startAt), endAt: d(endAt), createdById: userId } });
  }
  async updateEvent(id: string, dto: UpdateEventDto) {
    await this.ensure('event', id);
    const { startAt, endAt, ...rest } = dto;
    return this.prisma.event.update({
      where: { id },
      data: { ...rest, ...(startAt ? { startAt: new Date(startAt) } : {}), ...(endAt ? { endAt: d(endAt) } : {}) },
    });
  }
  async removeEvent(id: string) {
    await this.ensure('event', id);
    await this.prisma.event.delete({ where: { id } });
    return { success: true };
  }
  async registerEvent(eventId: string, dto: RegisterEventDto) {
    await this.ensure('event', eventId);
    return this.prisma.eventRegistration.create({ data: { eventId, ...dto } });
  }
  async toggleAttended(registrationId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({ where: { id: registrationId } });
    if (!reg) throw new NotFoundException('Registration not found');
    return this.prisma.eventRegistration.update({ where: { id: registrationId }, data: { attended: !reg.attended } });
  }
  async removeRegistration(registrationId: string) {
    await this.prisma.eventRegistration.delete({ where: { id: registrationId } });
    return { success: true };
  }

  // ---------------- Outreaches ----------------
  private buildOutreachWhere(query: {
    branchId?: string;
    search?: string;
    status?: string;
    typeId?: string;
    state?: string;
  }): Prisma.OutreachWhereInput {
    const where: Prisma.OutreachWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    if (query.status) {
      where.status = query.status as Prisma.OutreachWhereInput['status'];
    }

    if (query.typeId) {
      where.typeId = query.typeId;
    }

    if (query.state) {
      where.state = query.state;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      where.OR = [
        { title: { contains: q } },
        { location: { contains: q } },
        { description: { contains: q } },
        { coordinator: { contains: q } },
        { type: { name: { contains: q } } },
      ];
    }

    return where;
  }

  listOutreaches(query: {
    branchId?: string;
    search?: string;
    status?: string;
    typeId?: string;
    state?: string;
  } = {}) {
    const where = this.buildOutreachWhere(query);
    return this.prisma.outreach.findMany({
      where,
      orderBy: { startAt: 'desc' },
      include: outreachInclude,
    });
  }

  async outreachStats(query: {
    branchId?: string;
    search?: string;
    status?: string;
    typeId?: string;
    state?: string;
  } = {}) {
    const where = this.buildOutreachWhere(query);
    const typeWhere: Prisma.OutreachTypeWhereInput = {
      ...(query.branchId ? { branchId: query.branchId } : {}),
    };

    const [total, planned, completed, peopleReached, souls, types] = await Promise.all([
      this.prisma.outreach.count({ where }),
      this.prisma.outreach.count({ where: { ...where, status: 'PLANNED' } }),
      this.prisma.outreach.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.outreach.aggregate({ where, _sum: { peopleReached: true } }),
      this.prisma.outreach.aggregate({ where, _sum: { souls: true } }),
      this.prisma.outreachType.count({ where: typeWhere }),
    ]);

    return {
      total,
      planned,
      completed,
      peopleReached: peopleReached._sum.peopleReached ?? 0,
      souls: souls._sum.souls ?? 0,
      types,
    };
  }

  async getOutreach(id: string) {
    const outreach = await this.prisma.outreach.findUnique({
      where: { id },
      include: outreachInclude,
    });
    if (!outreach) throw new NotFoundException('Outreach not found');
    return outreach;
  }

  createOutreach(dto: CreateOutreachDto, userId?: string) {
    const { startAt, endAt, typeId, ...rest } = dto;
    return this.prisma.outreach.create({
      data: {
        ...rest,
        ...(typeId ? { typeId } : {}),
        startAt: d(startAt),
        endAt: d(endAt),
        createdById: userId,
      },
      include: outreachInclude,
    });
  }

  async updateOutreach(id: string, dto: UpdateOutreachDto) {
    await this.ensure('outreach', id);
    const { startAt, endAt, typeId, ...rest } = dto;
    return this.prisma.outreach.update({
      where: { id },
      data: {
        ...rest,
        ...(typeId !== undefined ? { typeId: typeId || null } : {}),
        ...(startAt ? { startAt: d(startAt) } : {}),
        ...(endAt ? { endAt: d(endAt) } : {}),
      },
      include: outreachInclude,
    });
  }

  async removeOutreach(id: string) {
    await this.ensure('outreach', id);
    await this.prisma.outreach.delete({ where: { id } });
    return { success: true };
  }

  async addOutreachImage(outreachId: string, dto: AddOutreachImageDto) {
    await this.ensure('outreach', outreachId);
    const count = await this.prisma.outreachImage.count({ where: { outreachId } });
    return this.prisma.outreachImage.create({
      data: { outreachId, url: dto.url, caption: dto.caption, sortOrder: count },
    });
  }

  async removeOutreachImage(outreachId: string, imageId: string) {
    const image = await this.prisma.outreachImage.findFirst({
      where: { id: imageId, outreachId },
    });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.outreachImage.delete({ where: { id: imageId } });
    return { success: true };
  }

  // ---------------- Outreach types ----------------
  listOutreachTypes(branchId?: string) {
    return this.prisma.outreachType.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { name: 'asc' },
      include: {
        branch: branchSel,
        _count: { select: { outreaches: true } },
      },
    });
  }

  async getOutreachType(id: string) {
    const type = await this.prisma.outreachType.findUnique({
      where: { id },
      include: { branch: branchSel, _count: { select: { outreaches: true } } },
    });
    if (!type) throw new NotFoundException('Outreach type not found');
    return type;
  }

  createOutreachType(dto: CreateOutreachTypeDto) {
    return this.prisma.outreachType.create({
      data: dto,
      include: { branch: branchSel, _count: { select: { outreaches: true } } },
    });
  }

  async updateOutreachType(id: string, dto: UpdateOutreachTypeDto) {
    await this.ensure('outreachType', id);
    return this.prisma.outreachType.update({
      where: { id },
      data: dto,
      include: { branch: branchSel, _count: { select: { outreaches: true } } },
    });
  }

  async removeOutreachType(id: string) {
    await this.ensure('outreachType', id);
    await this.prisma.outreachType.delete({ where: { id } });
    return { success: true };
  }

  // ---------------- helper ----------------
  private async ensure(model: 'sermon' | 'sermonSeries' | 'testimony' | 'testimonyCategory' | 'event' | 'outreach' | 'outreachType', id: string) {
    const found = await (this.prisma[model] as any).findUnique({ where: { id } });
    if (!found) throw new NotFoundException(`${model} not found`);
    return found;
  }
}
