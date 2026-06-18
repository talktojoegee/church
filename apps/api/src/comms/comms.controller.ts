import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { MessageChannel } from '@prisma/client';
import { CommsService } from './comms.service';
import { CreateTemplateDto, SendMessageDto, UpdateTemplateDto } from './dto/comms.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('comms/templates')
export class TemplatesController {
  constructor(private readonly comms: CommsService) {}

  @Get()
  @Permissions('comms.template.view')
  list(@Query('channel') channel?: MessageChannel) {
    return this.comms.listTemplates(channel);
  }

  @Post()
  @Permissions('comms.template.create')
  create(@Body() dto: CreateTemplateDto) {
    return this.comms.createTemplate(dto);
  }

  @Patch(':id')
  @Permissions('comms.template.update')
  update(@Param('id') id: string, @Body() dto: UpdateTemplateDto) {
    return this.comms.updateTemplate(id, dto);
  }

  @Delete(':id')
  @Permissions('comms.template.delete')
  remove(@Param('id') id: string) {
    return this.comms.removeTemplate(id);
  }
}

@Controller('comms/messages')
export class MessagesController {
  constructor(private readonly comms: CommsService) {}

  @Get()
  @Permissions('comms.message.view')
  list(@Query('branchId') branchId?: string) {
    return this.comms.listMessages(branchId);
  }

  @Get(':id')
  @Permissions('comms.message.view')
  get(@Param('id') id: string) {
    return this.comms.getMessage(id);
  }

  @Post('send')
  @Permissions('comms.message.create')
  send(@Body() dto: SendMessageDto, @CurrentUser() user: AuthUser) {
    return this.comms.send(dto, user.id);
  }
}
