import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateChurchDto, UpsertSettingDto } from './dto/settings.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Public()
  @Get('public')
  getPublicBranding() {
    return this.settings.getPublicBranding();
  }

  @Get('church')
  @Permissions('org.settings.view')
  getProfile() {
    return this.settings.getProfile();
  }

  @Patch('church')
  @Permissions('org.settings.update')
  updateProfile(@Body() dto: UpdateChurchDto) {
    return this.settings.updateProfile(dto);
  }

  @Get()
  @Permissions('org.settings.view')
  listSettings() {
    return this.settings.listSettings();
  }

  @Post()
  @Permissions('org.settings.update')
  upsertSetting(@Body() dto: UpsertSettingDto) {
    return this.settings.upsertSetting(dto);
  }

  @Post('bulk')
  @Permissions('org.settings.update')
  upsertBulk(@Body() body: Record<string, string>) {
    return this.settings.upsertSettings(body);
  }
}
