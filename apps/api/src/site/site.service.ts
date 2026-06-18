import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateSitePageDto,
  CreateSiteSectionDto,
  CreateSiteSlideDto,
  PublicContactDto,
  PublicTestimonyDto,
  UpdateGivingSettingsDto,
  UpdateSitePageDto,
  UpdateSiteSectionDto,
  UpdateSiteSlideDto,
} from './dto/site.dto';

const GIVING_KEYS = {
  intro: 'giving_intro',
  instructions: 'giving_instructions',
  bankName: 'giving_bank_name',
  accountName: 'giving_account_name',
  accountNumber: 'giving_account_number',
  paystackEnabled: 'giving_paystack_enabled',
} as const;

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  private async getChurch() {
    const church = await this.prisma.church.findFirst({
      include: {
        branches: { where: { isMain: true }, take: 1 },
        settings: true,
      },
    });
    if (!church) throw new NotFoundException('Church not configured');
    return church;
  }

  private settingsMap(settings: { key: string; value: string }[]) {
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  private async getMainBranchId(churchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { churchId, isMain: true },
      select: { id: true },
    });
    return branch?.id;
  }

  // ---------------------------------------------------------------------------
  // Public reads
  // ---------------------------------------------------------------------------

  async getPublicHome() {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);
    const branchId = church.branches[0]?.id;

    const [slides, sections, testimonies, events, sermons] = await Promise.all([
      this.prisma.siteSlide.findMany({
        where: { churchId: church.id, isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.siteSection.findMany({
        where: { churchId: church.id, pageSlug: 'home', isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.testimony.findMany({
        where: { status: 'APPROVED' },
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        take: 6,
        select: {
          id: true,
          title: true,
          body: true,
          authorName: true,
          isFeatured: true,
          createdAt: true,
          testimonyCategory: { select: { name: true } },
        },
      }),
      branchId
        ? this.prisma.event.findMany({
            where: { branchId, status: 'PUBLISHED', startAt: { gte: new Date() } },
            orderBy: { startAt: 'asc' },
            take: 4,
            select: {
              id: true,
              title: true,
              description: true,
              location: true,
              startAt: true,
              endAt: true,
            },
          })
        : Promise.resolve([]),
      branchId
        ? this.prisma.sermon.findMany({
            where: { branchId, isPublished: true },
            orderBy: { preachedAt: 'desc' },
            take: 3,
            select: {
              id: true,
              title: true,
              speaker: true,
              summary: true,
              preachedAt: true,
              videoUrl: true,
              audioUrl: true,
            },
          })
        : Promise.resolve([]),
    ]);

    return {
      branding: {
        name: church.name,
        logoUrl: church.logoUrl,
        email: church.email ?? '',
        phone: church.phone ?? '',
        address: church.address ?? '',
        tagline: settings.church_tagline ?? '',
        serviceTimes: settings.service_times ?? '',
      },
      slides,
      sections,
      testimonies,
      events,
      sermons,
    };
  }

  async getPublicPage(slug: string) {
    const church = await this.getChurch();
    const page = await this.prisma.sitePage.findFirst({
      where: { churchId: church.id, slug, status: 'PUBLISHED' },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async listPublicTestimonies() {
    return this.prisma.testimony.findMany({
      where: { status: 'APPROVED' },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        body: true,
        authorName: true,
        isFeatured: true,
        createdAt: true,
        testimonyCategory: { select: { name: true } },
      },
    });
  }

  async getPublicGiving() {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);
    const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY ?? '';
    const paystackConfigured = !!(
      paystackPublicKey && process.env.PAYSTACK_SECRET_KEY
    );
    const paystackEnabled =
      settings[GIVING_KEYS.paystackEnabled] === 'true' && paystackConfigured;

    const page = await this.prisma.sitePage.findFirst({
      where: { churchId: church.id, slug: 'give', status: 'PUBLISHED' },
    });

    return {
      intro: settings[GIVING_KEYS.intro] ?? '',
      instructions: settings[GIVING_KEYS.instructions] ?? '',
      bankName: settings[GIVING_KEYS.bankName] ?? '',
      accountName: settings[GIVING_KEYS.accountName] ?? '',
      accountNumber: settings[GIVING_KEYS.accountNumber] ?? '',
      paystackEnabled,
      paystackPublicKey: paystackEnabled ? paystackPublicKey : '',
      currency: church.currency,
      page,
    };
  }

  async submitContact(dto: PublicContactDto) {
    const church = await this.getChurch();
    const message = await this.prisma.contactMessage.create({
      data: {
        churchId: church.id,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        subject: dto.subject,
        message: dto.message,
      },
    });

    const reviewerIds = await this.notifications.findUserIdsWithPermission(
      'content.website.manage',
    );
    if (reviewerIds.length) {
      await this.notifications.notifyUsers(reviewerIds, {
        title: 'New contact message',
        body: `${dto.name}: ${dto.subject || 'General enquiry'}`,
        type: 'CONTACT',
        link: '/website?tab=contact',
      });
    }

    return { success: true, id: message.id };
  }

  async submitTestimony(dto: PublicTestimonyDto) {
    const testimony = await this.prisma.testimony.create({
      data: {
        title: dto.title,
        body: dto.body,
        authorName: dto.authorName,
        categoryId: dto.categoryId,
        status: 'PENDING',
      },
    });

    const reviewerIds = await this.notifications.findUserIdsWithPermission(
      'content.testimony.manage',
    );
    if (reviewerIds.length) {
      await this.notifications.notifyUsers(reviewerIds, {
        title: 'New testimony to review',
        body: testimony.title,
        type: 'TESTIMONY',
        link: `/testimonies/${testimony.id}`,
      });
    }

    return { success: true, id: testimony.id };
  }

  // ---------------------------------------------------------------------------
  // Admin — slides
  // ---------------------------------------------------------------------------

  async listSlides() {
    const church = await this.getChurch();
    return this.prisma.siteSlide.findMany({
      where: { churchId: church.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSlide(dto: CreateSiteSlideDto) {
    const church = await this.getChurch();
    return this.prisma.siteSlide.create({
      data: { churchId: church.id, ...dto },
    });
  }

  async updateSlide(id: string, dto: UpdateSiteSlideDto) {
    await this.ensureSlide(id);
    return this.prisma.siteSlide.update({ where: { id }, data: dto });
  }

  async removeSlide(id: string) {
    await this.ensureSlide(id);
    await this.prisma.siteSlide.delete({ where: { id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Admin — sections
  // ---------------------------------------------------------------------------

  async listSections(pageSlug?: string) {
    const church = await this.getChurch();
    return this.prisma.siteSection.findMany({
      where: {
        churchId: church.id,
        ...(pageSlug ? { pageSlug } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createSection(dto: CreateSiteSectionDto) {
    const church = await this.getChurch();
    return this.prisma.siteSection.create({
      data: { churchId: church.id, pageSlug: dto.pageSlug ?? 'home', ...dto },
    });
  }

  async updateSection(id: string, dto: UpdateSiteSectionDto) {
    await this.ensureSection(id);
    return this.prisma.siteSection.update({ where: { id }, data: dto });
  }

  async removeSection(id: string) {
    await this.ensureSection(id);
    await this.prisma.siteSection.delete({ where: { id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Admin — pages
  // ---------------------------------------------------------------------------

  async listPages() {
    const church = await this.getChurch();
    return this.prisma.sitePage.findMany({
      where: { churchId: church.id },
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
  }

  async getPage(id: string) {
    const page = await this.prisma.sitePage.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async createPage(dto: CreateSitePageDto) {
    const church = await this.getChurch();
    return this.prisma.sitePage.create({
      data: { churchId: church.id, ...dto },
    });
  }

  async updatePage(id: string, dto: UpdateSitePageDto) {
    await this.ensurePage(id);
    return this.prisma.sitePage.update({ where: { id }, data: dto });
  }

  async removePage(id: string) {
    await this.ensurePage(id);
    await this.prisma.sitePage.delete({ where: { id } });
    return { success: true };
  }

  // ---------------------------------------------------------------------------
  // Admin — contact & giving
  // ---------------------------------------------------------------------------

  async listContactMessages() {
    const church = await this.getChurch();
    return this.prisma.contactMessage.findMany({
      where: { churchId: church.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markContactRead(id: string, isRead = true) {
    await this.ensureContact(id);
    return this.prisma.contactMessage.update({
      where: { id },
      data: { isRead },
    });
  }

  async getGivingSettings() {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);
    return {
      givingIntro: settings[GIVING_KEYS.intro] ?? '',
      givingInstructions: settings[GIVING_KEYS.instructions] ?? '',
      givingBankName: settings[GIVING_KEYS.bankName] ?? '',
      givingAccountName: settings[GIVING_KEYS.accountName] ?? '',
      givingAccountNumber: settings[GIVING_KEYS.accountNumber] ?? '',
      givingPaystackEnabled: settings[GIVING_KEYS.paystackEnabled] === 'true',
      paystackConfigured: !!(
        process.env.PAYSTACK_PUBLIC_KEY && process.env.PAYSTACK_SECRET_KEY
      ),
    };
  }

  async updateGivingSettings(dto: UpdateGivingSettingsDto) {
    const church = await this.getChurch();
    const entries: [string, string][] = [];
    if (dto.givingIntro !== undefined) entries.push([GIVING_KEYS.intro, dto.givingIntro]);
    if (dto.givingInstructions !== undefined) {
      entries.push([GIVING_KEYS.instructions, dto.givingInstructions]);
    }
    if (dto.givingBankName !== undefined) entries.push([GIVING_KEYS.bankName, dto.givingBankName]);
    if (dto.givingAccountName !== undefined) {
      entries.push([GIVING_KEYS.accountName, dto.givingAccountName]);
    }
    if (dto.givingAccountNumber !== undefined) {
      entries.push([GIVING_KEYS.accountNumber, dto.givingAccountNumber]);
    }
    if (dto.givingPaystackEnabled !== undefined) {
      entries.push([GIVING_KEYS.paystackEnabled, String(dto.givingPaystackEnabled)]);
    }

    await Promise.all(
      entries.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { churchId_key: { churchId: church.id, key } },
          update: { value },
          create: { churchId: church.id, key, value },
        }),
      ),
    );

    return this.getGivingSettings();
  }

  private async ensureSlide(id: string) {
    const row = await this.prisma.siteSlide.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Slide not found');
  }

  private async ensureSection(id: string) {
    const row = await this.prisma.siteSection.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Section not found');
  }

  private async ensurePage(id: string) {
    const row = await this.prisma.sitePage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Page not found');
  }

  private async ensureContact(id: string) {
    const row = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Message not found');
  }
}
