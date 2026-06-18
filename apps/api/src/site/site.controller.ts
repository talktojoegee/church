import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { SiteService } from './site.service';
import { Permissions } from '../common/decorators/permissions.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateSiteGalleryDto,
  CreateSitePageDto,
  CreateSiteSectionDto,
  CreateSiteSlideDto,
  PublicContactDto,
  PublicEventRegisterDto,
  PublicTestimonyDto,
  PublicVerifyGivingDto,
  UpdateAboutSettingsDto,
  UpdateGivingSettingsDto,
  UpdateSiteGalleryDto,
  UpdateSitePageDto,
  UpdateSiteSectionDto,
  UpdateSiteSlideDto,
} from './dto/site.dto';

@Controller('site/public')
export class SitePublicController {
  constructor(private readonly site: SiteService) {}

  @Public()
  @Get('home')
  home() {
    return this.site.getPublicHome();
  }

  @Public()
  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.site.getPublicPage(slug);
  }

  @Public()
  @Get('about')
  about() {
    return this.site.getPublicAbout();
  }

  @Public()
  @Get('testimonies')
  testimonies() {
    return this.site.listPublicTestimonies();
  }

  @Public()
  @Get('giving')
  giving() {
    return this.site.getPublicGiving();
  }

  @Public()
  @Post('giving/verify')
  verifyGiving(@Body() dto: PublicVerifyGivingDto) {
    return this.site.verifyPublicGiving(dto);
  }

  @Public()
  @Get('events')
  events() {
    return this.site.listPublicEvents();
  }

  @Public()
  @Get('events/:id')
  event(@Param('id') id: string) {
    return this.site.getPublicEvent(id);
  }

  @Public()
  @Get('sermons')
  sermons() {
    return this.site.listPublicSermons();
  }

  @Public()
  @Get('sermons/:id')
  sermon(@Param('id') id: string) {
    return this.site.getPublicSermon(id);
  }

  @Public()
  @Post('events/:id/register')
  registerEvent(@Param('id') id: string, @Body() dto: PublicEventRegisterDto) {
    return this.site.registerPublicEvent(id, dto);
  }

  @Public()
  @Get('outreaches')
  outreaches() {
    return this.site.listPublicOutreaches();
  }

  @Public()
  @Get('outreaches/:id')
  outreach(@Param('id') id: string) {
    return this.site.getPublicOutreach(id);
  }

  @Public()
  @Get('gallery')
  gallery() {
    return this.site.listPublicGallery();
  }

  @Public()
  @Post('contact')
  contact(@Body() dto: PublicContactDto) {
    return this.site.submitContact(dto);
  }

  @Public()
  @Post('testimonies')
  submitTestimony(@Body() dto: PublicTestimonyDto) {
    return this.site.submitTestimony(dto);
  }
}

@Controller('site')
export class SiteAdminController {
  constructor(private readonly site: SiteService) {}

  // Slides
  @Get('slides') @Permissions('content.website.view')
  listSlides() {
    return this.site.listSlides();
  }

  @Post('slides') @Permissions('content.website.create')
  createSlide(@Body() dto: CreateSiteSlideDto) {
    return this.site.createSlide(dto);
  }

  @Patch('slides/:id') @Permissions('content.website.update')
  updateSlide(@Param('id') id: string, @Body() dto: UpdateSiteSlideDto) {
    return this.site.updateSlide(id, dto);
  }

  @Delete('slides/:id') @Permissions('content.website.delete')
  removeSlide(@Param('id') id: string) {
    return this.site.removeSlide(id);
  }

  // Sections
  @Get('sections') @Permissions('content.website.view')
  listSections(@Query('pageSlug') pageSlug?: string) {
    return this.site.listSections(pageSlug);
  }

  @Post('sections') @Permissions('content.website.create')
  createSection(@Body() dto: CreateSiteSectionDto) {
    return this.site.createSection(dto);
  }

  @Patch('sections/:id') @Permissions('content.website.update')
  updateSection(@Param('id') id: string, @Body() dto: UpdateSiteSectionDto) {
    return this.site.updateSection(id, dto);
  }

  @Delete('sections/:id') @Permissions('content.website.delete')
  removeSection(@Param('id') id: string) {
    return this.site.removeSection(id);
  }

  // Pages
  @Get('pages') @Permissions('content.website.view')
  listPages() {
    return this.site.listPages();
  }

  @Get('pages/:id') @Permissions('content.website.view')
  getPage(@Param('id') id: string) {
    return this.site.getPage(id);
  }

  @Post('pages') @Permissions('content.website.create')
  createPage(@Body() dto: CreateSitePageDto) {
    return this.site.createPage(dto);
  }

  @Patch('pages/:id') @Permissions('content.website.update')
  updatePage(@Param('id') id: string, @Body() dto: UpdateSitePageDto) {
    return this.site.updatePage(id, dto);
  }

  @Delete('pages/:id') @Permissions('content.website.delete')
  removePage(@Param('id') id: string) {
    return this.site.removePage(id);
  }

  // Contact inbox
  @Get('contact-messages') @Permissions('content.website.manage')
  listContactMessages() {
    return this.site.listContactMessages();
  }

  @Patch('contact-messages/:id/read') @Permissions('content.website.manage')
  markContactRead(@Param('id') id: string, @Body('isRead') isRead?: boolean) {
    return this.site.markContactRead(id, isRead ?? true);
  }

  // Giving settings
  @Get('giving') @Permissions('content.website.view')
  getGivingSettings() {
    return this.site.getGivingSettings();
  }

  @Patch('giving') @Permissions('content.website.manage')
  updateGivingSettings(@Body() dto: UpdateGivingSettingsDto) {
    return this.site.updateGivingSettings(dto);
  }

  @Get('about') @Permissions('content.website.view')
  getAboutSettings() {
    return this.site.getAboutSettings();
  }

  @Patch('about') @Permissions('content.website.manage')
  updateAboutSettings(@Body() dto: UpdateAboutSettingsDto) {
    return this.site.updateAboutSettings(dto);
  }

  // Gallery
  @Get('gallery') @Permissions('content.website.view')
  listGallery() {
    return this.site.listGallery();
  }

  @Post('gallery') @Permissions('content.website.create')
  createGallery(@Body() dto: CreateSiteGalleryDto) {
    return this.site.createGallery(dto);
  }

  @Patch('gallery/:id') @Permissions('content.website.update')
  updateGallery(@Param('id') id: string, @Body() dto: UpdateSiteGalleryDto) {
    return this.site.updateGallery(id, dto);
  }

  @Delete('gallery/:id') @Permissions('content.website.delete')
  removeGallery(@Param('id') id: string) {
    return this.site.removeGallery(id);
  }
}
