import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { ContentService } from './content.service';
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
  SermonQueryDto,
  RegisterEventDto,
  ReviewTestimonyDto,
  EventQueryDto,
  UpdateEventDto,
  UpdateOutreachDto,
  UpdateOutreachTypeDto,
  UpdateSermonDto,
  UpdateSermonSeriesDto,
  UpdateTestimonyDto,
  UpdateTestimonyCategoryDto,
} from './dto/content.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('sermons')
export class SermonsController {
  constructor(private readonly content: ContentService) {}
  @Get() @Permissions('content.sermon.view')
  list(@Query() query: SermonQueryDto) {
    return this.content.listSermons(query);
  }
  @Get('stats') @Permissions('content.sermon.view')
  stats(@Query() query: SermonQueryDto) {
    return this.content.sermonStats(query);
  }
  @Get(':id') @Permissions('content.sermon.view')
  one(@Param('id') id: string) {
    return this.content.getSermon(id);
  }
  @Post() @Permissions('content.sermon.create')
  create(@Body() dto: CreateSermonDto, @CurrentUser() user: AuthUser) {
    return this.content.createSermon(dto, user.id);
  }
  @Patch(':id') @Permissions('content.sermon.update')
  update(@Param('id') id: string, @Body() dto: UpdateSermonDto) {
    return this.content.updateSermon(id, dto);
  }
  @Delete(':id') @Permissions('content.sermon.delete')
  remove(@Param('id') id: string) {
    return this.content.removeSermon(id);
  }
}

@Controller('sermon-series')
export class SermonSeriesController {
  constructor(private readonly content: ContentService) {}

  @Get() @Permissions('content.sermon.view')
  list(@Query('branchId') branchId?: string) {
    return this.content.listSermonSeries(branchId);
  }

  @Get('playlists') @Permissions('content.sermon.view')
  playlists(@Query('branchId') branchId?: string) {
    return this.content.sermonPlaylists(branchId);
  }

  @Get(':id') @Permissions('content.sermon.view')
  one(@Param('id') id: string) {
    return this.content.getSermonSeries(id);
  }

  @Post() @Permissions('content.sermon.create')
  create(@Body() dto: CreateSermonSeriesDto) {
    return this.content.createSermonSeries(dto);
  }

  @Patch(':id') @Permissions('content.sermon.update')
  update(@Param('id') id: string, @Body() dto: UpdateSermonSeriesDto) {
    return this.content.updateSermonSeries(id, dto);
  }

  @Delete(':id') @Permissions('content.sermon.delete')
  remove(@Param('id') id: string) {
    return this.content.removeSermonSeries(id);
  }
}

@Controller('testimonies')
export class TestimoniesController {
  constructor(private readonly content: ContentService) {}
  @Get() @Permissions('content.testimony.view')
  list(@Query() query: TestimonyQueryDto) {
    return this.content.listTestimonies(query);
  }
  @Get('stats') @Permissions('content.testimony.view')
  stats(@Query() query: TestimonyQueryDto) {
    return this.content.testimonyStats(query);
  }
  @Get(':id') @Permissions('content.testimony.view')
  one(@Param('id') id: string) {
    return this.content.getTestimony(id);
  }
  @Post() @Permissions('content.testimony.create')
  create(@Body() dto: CreateTestimonyDto) {
    return this.content.createTestimony(dto);
  }
  @Patch(':id') @Permissions('content.testimony.update')
  update(@Param('id') id: string, @Body() dto: UpdateTestimonyDto) {
    return this.content.updateTestimony(id, dto);
  }
  @Patch(':id/review') @Permissions('content.testimony.manage')
  review(@Param('id') id: string, @Body() dto: ReviewTestimonyDto, @CurrentUser() user: AuthUser) {
    return this.content.reviewTestimony(id, dto, user.id);
  }
  @Delete(':id') @Permissions('content.testimony.delete')
  remove(@Param('id') id: string) {
    return this.content.removeTestimony(id);
  }
}

@Controller('testimony-categories')
export class TestimonyCategoriesController {
  constructor(private readonly content: ContentService) {}

  @Get() @Permissions('content.testimony.view')
  list() {
    return this.content.listTestimonyCategories();
  }

  @Get(':id') @Permissions('content.testimony.view')
  one(@Param('id') id: string) {
    return this.content.getTestimonyCategory(id);
  }

  @Post() @Permissions('content.testimony.create')
  create(@Body() dto: CreateTestimonyCategoryDto) {
    return this.content.createTestimonyCategory(dto);
  }

  @Patch(':id') @Permissions('content.testimony.update')
  update(@Param('id') id: string, @Body() dto: UpdateTestimonyCategoryDto) {
    return this.content.updateTestimonyCategory(id, dto);
  }

  @Delete(':id') @Permissions('content.testimony.delete')
  remove(@Param('id') id: string) {
    return this.content.removeTestimonyCategory(id);
  }
}

@Controller('events')
export class EventsController {
  constructor(private readonly content: ContentService) {}
  @Get() @Permissions('engagement.event.view')
  list(@Query() query: EventQueryDto) {
    return this.content.listEvents(query);
  }
  @Get('stats') @Permissions('engagement.event.view')
  stats(@Query() query: EventQueryDto) {
    return this.content.eventStats(query);
  }
  @Get(':id') @Permissions('engagement.event.view')
  get(@Param('id') id: string) {
    return this.content.getEvent(id);
  }
  @Post() @Permissions('engagement.event.create')
  create(@Body() dto: CreateEventDto, @CurrentUser() user: AuthUser) {
    return this.content.createEvent(dto, user.id);
  }
  @Patch(':id') @Permissions('engagement.event.update')
  update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.content.updateEvent(id, dto);
  }
  @Delete(':id') @Permissions('engagement.event.delete')
  remove(@Param('id') id: string) {
    return this.content.removeEvent(id);
  }
  @Post(':id/register') @Permissions('engagement.event.update')
  register(@Param('id') id: string, @Body() dto: RegisterEventDto) {
    return this.content.registerEvent(id, dto);
  }
  @Patch('registrations/:regId/attended') @Permissions('engagement.event.update')
  toggleAttended(@Param('regId') regId: string) {
    return this.content.toggleAttended(regId);
  }
  @Delete('registrations/:regId') @Permissions('engagement.event.update')
  removeRegistration(@Param('regId') regId: string) {
    return this.content.removeRegistration(regId);
  }
}

@Controller('outreaches')
export class OutreachesController {
  constructor(private readonly content: ContentService) {}
  @Get() @Permissions('content.outreach.view')
  list(@Query() query: OutreachQueryDto) {
    return this.content.listOutreaches(query);
  }
  @Get('stats') @Permissions('content.outreach.view')
  stats(@Query() query: OutreachQueryDto) {
    return this.content.outreachStats(query);
  }
  @Get(':id') @Permissions('content.outreach.view')
  one(@Param('id') id: string) {
    return this.content.getOutreach(id);
  }
  @Post() @Permissions('content.outreach.create')
  create(@Body() dto: CreateOutreachDto, @CurrentUser() user: AuthUser) {
    return this.content.createOutreach(dto, user.id);
  }
  @Patch(':id') @Permissions('content.outreach.update')
  update(@Param('id') id: string, @Body() dto: UpdateOutreachDto) {
    return this.content.updateOutreach(id, dto);
  }
  @Post(':id/images') @Permissions('content.outreach.update')
  addImage(@Param('id') id: string, @Body() dto: AddOutreachImageDto) {
    return this.content.addOutreachImage(id, dto);
  }
  @Delete(':id/images/:imageId') @Permissions('content.outreach.update')
  removeImage(@Param('id') id: string, @Param('imageId') imageId: string) {
    return this.content.removeOutreachImage(id, imageId);
  }
  @Delete(':id') @Permissions('content.outreach.delete')
  remove(@Param('id') id: string) {
    return this.content.removeOutreach(id);
  }
}

@Controller('outreach-types')
export class OutreachTypesController {
  constructor(private readonly content: ContentService) {}

  @Get() @Permissions('content.outreach.view')
  list(@Query('branchId') branchId?: string) {
    return this.content.listOutreachTypes(branchId);
  }

  @Get(':id') @Permissions('content.outreach.view')
  one(@Param('id') id: string) {
    return this.content.getOutreachType(id);
  }

  @Post() @Permissions('content.outreach.create')
  create(@Body() dto: CreateOutreachTypeDto) {
    return this.content.createOutreachType(dto);
  }

  @Patch(':id') @Permissions('content.outreach.update')
  update(@Param('id') id: string, @Body() dto: UpdateOutreachTypeDto) {
    return this.content.updateOutreachType(id, dto);
  }

  @Delete(':id') @Permissions('content.outreach.delete')
  remove(@Param('id') id: string) {
    return this.content.removeOutreachType(id);
  }
}
