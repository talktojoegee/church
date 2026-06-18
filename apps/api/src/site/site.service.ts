import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { FinanceService } from '../finance/finance.service';
import {
  CreateSiteGalleryDto,
  CreateSitePageDto,
  CreateSiteSectionDto,
  CreateSiteSlideDto,
  PublicContactDto,
  PublicEventRegisterDto,
  PublicTestimonyDto,
  UpdateAboutSettingsDto,
  UpdateGivingSettingsDto,
  UpdateSiteGalleryDto,
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
  paystackPublicKey: 'paystack_public_key',
  paystackSecretKey: 'paystack_secret_key',
} as const;

const ABOUT_KEYS = {
  pastorName: 'pastor_name',
  pastorTitle: 'pastor_title',
  pastorBio: 'pastor_bio',
  pastorPhotoUrl: 'pastor_photo_url',
  aboutFounded: 'about_founded',
  aboutStory: 'about_story',
  aboutBeliefs: 'about_beliefs',
  aboutValues: 'about_values',
} as const;

@Injectable()
export class SiteService {
  private readonly logger = new Logger(SiteService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly finance: FinanceService,
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

  private resolvePaystackKeys(settings: Record<string, string>) {
    const publicKey =
      settings[GIVING_KEYS.paystackPublicKey]?.trim() ||
      process.env.PAYSTACK_PUBLIC_KEY?.trim() ||
      '';
    const secretKey =
      settings[GIVING_KEYS.paystackSecretKey]?.trim() ||
      process.env.PAYSTACK_SECRET_KEY?.trim() ||
      '';
    return { publicKey, secretKey, configured: !!(publicKey && secretKey) };
  }

  private maskSecretKey(key: string) {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
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

    const [slides, sections, testimonies, events, sermons, outreaches] = await Promise.all([
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
              capacity: true,
              _count: { select: { registrations: true } },
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
      this.listPublicOutreaches(6),
    ]);

    const publicEvents = events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      startAt: e.startAt,
      endAt: e.endAt,
      capacity: e.capacity,
      registrationCount: e._count.registrations,
    }));

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
      events: publicEvents,
      sermons,
      outreaches,
    };
  }

  private mapPublicOutreach(
    o: {
      id: string;
      title: string;
      description: string | null;
      location: string | null;
      state: string | null;
      startAt: Date | null;
      endAt: Date | null;
      status: string;
      peopleReached: number | null;
      souls: number | null;
      outcome: string | null;
      type: { name: string } | null;
      branch: { name: string };
      images: Array<{ id: string; url: string; caption: string | null; sortOrder: number }>;
    },
  ) {
    const images = o.images.map((img) => ({
      id: img.id,
      url: img.url,
      caption: img.caption,
      sortOrder: img.sortOrder,
    }));

    return {
      id: o.id,
      title: o.title,
      description: o.description,
      location: o.location,
      state: o.state,
      startAt: o.startAt,
      endAt: o.endAt,
      status: o.status,
      peopleReached: o.peopleReached,
      souls: o.souls,
      outcome: o.outcome,
      typeName: o.type?.name ?? null,
      branchName: o.branch.name,
      coverImage: images[0]?.url ?? null,
      imageCount: images.length,
      images,
    };
  }

  async listPublicOutreaches(limit?: number) {
    const church = await this.getChurch();
    const rows = await this.prisma.outreach.findMany({
      where: {
        branch: { churchId: church.id },
        status: { not: 'CANCELLED' },
      },
      orderBy: { startAt: 'desc' },
      take: limit,
      include: {
        type: { select: { name: true } },
        branch: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    return rows.map((o) => this.mapPublicOutreach(o));
  }

  async getPublicOutreach(id: string) {
    const church = await this.getChurch();
    const outreach = await this.prisma.outreach.findFirst({
      where: {
        id,
        branch: { churchId: church.id },
        status: { not: 'CANCELLED' },
      },
      include: {
        type: { select: { name: true } },
        branch: { select: { name: true } },
        images: { orderBy: { sortOrder: 'asc' } },
      },
    });
    if (!outreach) throw new NotFoundException('Outreach not found');
    return this.mapPublicOutreach(outreach);
  }

  async listPublicEvents() {
    const church = await this.getChurch();
    const branchId = church.branches[0]?.id;
    if (!branchId) return [];

    const events = await this.prisma.event.findMany({
      where: { branchId, status: 'PUBLISHED' },
      orderBy: { startAt: 'asc' },
      include: { _count: { select: { registrations: true } } },
    });

    return events.map((e) => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      startAt: e.startAt,
      endAt: e.endAt,
      capacity: e.capacity,
      isAllDay: e.isAllDay,
      registrationCount: e._count.registrations,
      isPast: e.startAt < new Date(),
    }));
  }

  async getPublicEvent(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: { _count: { select: { registrations: true } }, branch: { select: { name: true } } },
    });
    if (!event) throw new NotFoundException('Event not found');

    const spotsLeft =
      event.capacity != null ? Math.max(0, event.capacity - event._count.registrations) : null;

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startAt: event.startAt,
      endAt: event.endAt,
      capacity: event.capacity,
      isAllDay: event.isAllDay,
      registrationCount: event._count.registrations,
      spotsLeft,
      branchName: event.branch.name,
      isPast: event.startAt < new Date(),
      canRegister: event.startAt >= new Date() && (spotsLeft === null || spotsLeft > 0),
    };
  }

  async registerPublicEvent(id: string, dto: PublicEventRegisterDto) {
    const event = await this.getPublicEvent(id);
    if (event.isPast) throw new BadRequestException('This event has already started');
    if (!event.canRegister) throw new BadRequestException('This event is full');

    const registration = await this.prisma.eventRegistration.create({
      data: { eventId: id, guestName: dto.guestName, guestPhone: dto.guestPhone },
    });

    return { success: true, id: registration.id };
  }

  private sermonPublicSelect = {
    id: true,
    title: true,
    speaker: true,
    scripture: true,
    summary: true,
    notes: true,
    preachedAt: true,
    audioUrl: true,
    videoUrl: true,
    tags: true,
    sermonSeries: { select: { name: true } },
    branch: { select: { name: true } },
  } as const;

  private mapPublicSermon(s: {
    id: string;
    title: string;
    speaker: string | null;
    scripture?: string | null;
    summary?: string | null;
    notes?: string | null;
    preachedAt: Date | null;
    audioUrl?: string | null;
    videoUrl?: string | null;
    tags?: string | null;
    sermonSeries?: { name: string } | null;
    branch?: { name: string } | null;
  }) {
    return {
      id: s.id,
      title: s.title,
      speaker: s.speaker,
      scripture: s.scripture ?? null,
      summary: s.summary ?? null,
      notes: s.notes ?? null,
      preachedAt: s.preachedAt,
      audioUrl: s.audioUrl ?? null,
      videoUrl: s.videoUrl ?? null,
      tags: s.tags ?? null,
      seriesName: s.sermonSeries?.name ?? null,
      branchName: s.branch?.name ?? null,
    };
  }

  async listPublicSermons() {
    const church = await this.getChurch();
    const branchId = church.branches[0]?.id;
    if (!branchId) return [];

    const sermons = await this.prisma.sermon.findMany({
      where: { branchId, isPublished: true },
      orderBy: { preachedAt: 'desc' },
      select: this.sermonPublicSelect,
    });

    return sermons.map((s) => this.mapPublicSermon(s));
  }

  async getPublicSermon(id: string) {
    const sermon = await this.prisma.sermon.findFirst({
      where: { id, isPublished: true },
      select: this.sermonPublicSelect,
    });
    if (!sermon) throw new NotFoundException('Sermon not found');
    return this.mapPublicSermon(sermon);
  }

  async listPublicGallery() {
    const church = await this.getChurch();
    return this.prisma.siteGalleryImage.findMany({
      where: { churchId: church.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, title: true, caption: true, imageUrl: true, sortOrder: true },
    });
  }

  async getPublicPage(slug: string) {
    const church = await this.getChurch();
    const page = await this.prisma.sitePage.findFirst({
      where: { churchId: church.id, slug, status: 'PUBLISHED' },
    });
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }

  async getPublicAbout() {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);

    const [page, sections, mainBranch] = await Promise.all([
      this.prisma.sitePage.findFirst({
        where: { churchId: church.id, slug: 'about', status: 'PUBLISHED' },
      }),
      this.prisma.siteSection.findMany({
        where: { churchId: church.id, pageSlug: 'about', isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.branch.findFirst({
        where: { churchId: church.id, isMain: true },
        include: {
          branchPastor: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true,
              occupation: true,
            },
          },
          assistantPastor: {
            select: {
              firstName: true,
              lastName: true,
              photoUrl: true,
              occupation: true,
            },
          },
        },
      }),
    ]);

    const pastorMember = mainBranch?.branchPastor;
    const pastorName =
      settings[ABOUT_KEYS.pastorName] ||
      (pastorMember ? `${pastorMember.firstName} ${pastorMember.lastName}` : '');
    const pastorPhoto =
      settings[ABOUT_KEYS.pastorPhotoUrl] || pastorMember?.photoUrl || null;

    const parseLines = (raw: string) =>
      raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

    return {
      page,
      sections,
      church: {
        name: church.name,
        address: church.address ?? '',
        phone: church.phone ?? '',
        email: church.email ?? '',
        tagline: settings.church_tagline ?? '',
        serviceTimes: settings.service_times ?? '',
      },
      pastor: {
        name: pastorName,
        title: settings[ABOUT_KEYS.pastorTitle] || pastorMember?.occupation || 'Senior Pastor',
        bio: settings[ABOUT_KEYS.pastorBio] ?? '',
        photoUrl: pastorPhoto,
      },
      assistantPastor: mainBranch?.assistantPastor
        ? {
            name: `${mainBranch.assistantPastor.firstName} ${mainBranch.assistantPastor.lastName}`,
            title: mainBranch.assistantPastor.occupation || 'Assistant Pastor',
            photoUrl: mainBranch.assistantPastor.photoUrl,
          }
        : null,
      founded: settings[ABOUT_KEYS.aboutFounded] ?? '',
      story: settings[ABOUT_KEYS.aboutStory] ?? page?.body ?? '',
      beliefs: parseLines(settings[ABOUT_KEYS.aboutBeliefs] ?? ''),
      values: parseLines(settings[ABOUT_KEYS.aboutValues] ?? ''),
    };
  }

  async getAboutSettings() {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);
    return {
      pastorName: settings[ABOUT_KEYS.pastorName] ?? '',
      pastorTitle: settings[ABOUT_KEYS.pastorTitle] ?? '',
      pastorBio: settings[ABOUT_KEYS.pastorBio] ?? '',
      pastorPhotoUrl: settings[ABOUT_KEYS.pastorPhotoUrl] ?? '',
      aboutFounded: settings[ABOUT_KEYS.aboutFounded] ?? '',
      aboutStory: settings[ABOUT_KEYS.aboutStory] ?? '',
      aboutBeliefs: settings[ABOUT_KEYS.aboutBeliefs] ?? '',
      aboutValues: settings[ABOUT_KEYS.aboutValues] ?? '',
    };
  }

  async updateAboutSettings(dto: UpdateAboutSettingsDto) {
    const church = await this.getChurch();
    const map: [string, string | undefined][] = [
      [ABOUT_KEYS.pastorName, dto.pastorName],
      [ABOUT_KEYS.pastorTitle, dto.pastorTitle],
      [ABOUT_KEYS.pastorBio, dto.pastorBio],
      [ABOUT_KEYS.pastorPhotoUrl, dto.pastorPhotoUrl],
      [ABOUT_KEYS.aboutFounded, dto.aboutFounded],
      [ABOUT_KEYS.aboutStory, dto.aboutStory],
      [ABOUT_KEYS.aboutBeliefs, dto.aboutBeliefs],
      [ABOUT_KEYS.aboutValues, dto.aboutValues],
    ];

    await Promise.all(
      map
        .filter(([, v]) => v !== undefined)
        .map(([key, value]) =>
          this.prisma.setting.upsert({
            where: { churchId_key: { churchId: church.id, key } },
            update: { value: value! },
            create: { churchId: church.id, key, value: value! },
          }),
        ),
    );

    return this.getAboutSettings();
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
    const paystack = this.resolvePaystackKeys(settings);
    const paystackEnabled =
      settings[GIVING_KEYS.paystackEnabled] === 'true' && paystack.configured;

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
      paystackPublicKey: paystackEnabled ? paystack.publicKey.trim() : '',
      currency: church.currency,
      page,
    };
  }

  async verifyPublicGiving(dto: {
    reference: string;
    amount: number;
    donorName: string;
    email?: string;
  }) {
    const church = await this.getChurch();
    const settings = this.settingsMap(church.settings);
    const paystack = this.resolvePaystackKeys(settings);

    if (settings[GIVING_KEYS.paystackEnabled] !== 'true' || !paystack.configured) {
      throw new BadRequestException('Online giving is not enabled');
    }

    const existing = await this.prisma.contribution.findFirst({
      where: { reference: dto.reference },
    });
    if (existing) {
      return {
        success: true,
        duplicate: true,
        receiptNumber: existing.receiptNumber,
        amount: Number(existing.amount),
      };
    }

    const body = await this.fetchPaystackVerification(dto.reference, paystack.secretKey);
    if (!body.status || body.data?.status !== 'success') {
      throw new BadRequestException('Payment verification failed');
    }

    const paidAmount = (body.data?.amount ?? 0) / 100;
    if (Math.abs(paidAmount - dto.amount) > 1) {
      throw new BadRequestException('Paid amount does not match the giving amount');
    }

    const branchId = church.branches[0]?.id ?? (await this.getMainBranchId(church.id));
    if (!branchId) throw new BadRequestException('Church branch is not configured');

    const givingType = await this.resolveOnlineGivingType(branchId);
    const fundId = await this.finance.resolveFundId(branchId);

    const donorName = dto.donorName.trim();
    const donorEmail = dto.email?.trim() || null;

    const year = new Date().getFullYear();
    const count = await this.prisma.contribution.count();
    const receiptNumber = `RCP-${year}-${String(count + 1).padStart(5, '0')}`;

    const contribution = await this.prisma.contribution.create({
      data: {
        branchId,
        givingTypeId: givingType.id,
        fundId,
        amount: dto.amount,
        paymentMethod: 'ONLINE',
        reference: dto.reference,
        donorName,
        donorEmail,
        receiptNumber,
        contributedAt: new Date(),
        note: `Paystack online giving${donorEmail ? ` · ${donorEmail}` : ''}`,
      },
    });

    const reviewerIds = await this.notifications.findUserIdsWithPermission(
      'finance.contribution.view',
    );
    if (reviewerIds.length) {
      await this.notifications.notifyUsers(reviewerIds, {
        title: 'New online giving',
        body: `${donorName} gave ${church.currency} ${dto.amount.toLocaleString()} via Online Giving`,
        type: 'GIVING',
        link: '/finance',
      });
    }

    return {
      success: true,
      duplicate: false,
      receiptNumber: contribution.receiptNumber,
      amount: dto.amount,
    };
  }

  private async resolveOnlineGivingType(branchId: string) {
    const existing = await this.prisma.givingType.findFirst({
      where: { branchId, name: 'Online Giving' },
    });
    if (existing) return existing;

    return this.prisma.givingType.create({
      data: {
        branchId,
        name: 'Online Giving',
        description: 'Paystack and other online donations',
      },
    });
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
      'Could not verify payment with Paystack. If you were charged, contact the church with your payment reference.',
    );
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
    const paystack = this.resolvePaystackKeys(settings);
    const storedSecret = settings[GIVING_KEYS.paystackSecretKey]?.trim() ?? '';

    return {
      givingIntro: settings[GIVING_KEYS.intro] ?? '',
      givingInstructions: settings[GIVING_KEYS.instructions] ?? '',
      givingBankName: settings[GIVING_KEYS.bankName] ?? '',
      givingAccountName: settings[GIVING_KEYS.accountName] ?? '',
      givingAccountNumber: settings[GIVING_KEYS.accountNumber] ?? '',
      givingPaystackEnabled: settings[GIVING_KEYS.paystackEnabled] === 'true',
      paystackPublicKey: settings[GIVING_KEYS.paystackPublicKey] ?? '',
      paystackSecretKeyMasked: storedSecret ? this.maskSecretKey(storedSecret) : '',
      paystackConfigured: paystack.configured,
      paystackKeysSource:
        settings[GIVING_KEYS.paystackPublicKey] || settings[GIVING_KEYS.paystackSecretKey]
          ? 'settings'
          : paystack.configured
            ? 'environment'
            : 'none',
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
    if (dto.paystackPublicKey !== undefined) {
      entries.push([GIVING_KEYS.paystackPublicKey, dto.paystackPublicKey.trim()]);
    }
    if (dto.paystackSecretKey !== undefined && dto.paystackSecretKey.trim()) {
      entries.push([GIVING_KEYS.paystackSecretKey, dto.paystackSecretKey.trim()]);
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

  // ---------------------------------------------------------------------------
  // Admin — gallery
  // ---------------------------------------------------------------------------

  async listGallery() {
    const church = await this.getChurch();
    return this.prisma.siteGalleryImage.findMany({
      where: { churchId: church.id },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createGallery(dto: CreateSiteGalleryDto) {
    const church = await this.getChurch();
    return this.prisma.siteGalleryImage.create({
      data: { churchId: church.id, ...dto },
    });
  }

  async updateGallery(id: string, dto: UpdateSiteGalleryDto) {
    await this.ensureGallery(id);
    return this.prisma.siteGalleryImage.update({ where: { id }, data: dto });
  }

  async removeGallery(id: string) {
    await this.ensureGallery(id);
    await this.prisma.siteGalleryImage.delete({ where: { id } });
    return { success: true };
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

  private async ensureGallery(id: string) {
    const row = await this.prisma.siteGalleryImage.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Gallery image not found');
  }
}
