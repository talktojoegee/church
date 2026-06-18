import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateChurchDto, UpsertSettingDto } from './dto/settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getChurch() {
    const church = await this.prisma.church.findFirst({
      include: { branches: { where: { isMain: true }, take: 1 } },
    });
    if (!church) throw new NotFoundException('Church not configured');
    return church;
  }

  async getProfile() {
    return this.getChurch();
  }

  async updateProfile(dto: UpdateChurchDto) {
    const church = await this.getChurch();
    return this.prisma.church.update({ where: { id: church.id }, data: dto });
  }

  async listSettings() {
    const church = await this.getChurch();
    const rows = await this.prisma.setting.findMany({ where: { churchId: church.id } });
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async upsertSetting(dto: UpsertSettingDto) {
    const church = await this.getChurch();
    return this.prisma.setting.upsert({
      where: { churchId_key: { churchId: church.id, key: dto.key } },
      update: { value: dto.value },
      create: { churchId: church.id, key: dto.key, value: dto.value },
    });
  }

  async upsertSettings(settings: Record<string, string>) {
    const church = await this.getChurch();
    await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { churchId_key: { churchId: church.id, key } },
          update: { value },
          create: { churchId: church.id, key, value },
        }),
      ),
    );
    return this.listSettings();
  }

  async getPublicBranding() {
    const church = await this.getChurch();
    const settings = await this.listSettings();
    return {
      name: church.name,
      logoUrl: church.logoUrl,
      email: church.email ?? '',
      phone: church.phone ?? '',
      address: church.address ?? '',
      currency: church.currency,
      tagline: settings.church_tagline ?? '',
      serviceTimes: settings.service_times ?? '',
      seo: {
        title: settings.seo_title || church.name,
        description: settings.seo_description || '',
        keywords: settings.seo_keywords || '',
        ogImage: settings.seo_og_image || church.logoUrl || '',
        allowCrawl: settings.seo_allow_crawl !== 'false',
      },
    };
  }
}
