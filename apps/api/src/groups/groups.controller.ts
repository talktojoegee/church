import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { GroupsService } from './groups.service';
import {
  CreateGroupAnnouncementDto,
  CreateGroupDto,
  CreateGroupMeetingDto,
  CreateGroupNoteDto,
  SetGroupMembersDto,
  UpdateGroupDto,
} from './dto/group.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Get()
  @Permissions('membership.group.view')
  findMany(@Query('branchId') branchId?: string) {
    return this.groupsService.findMany(branchId);
  }

  @Get(':id')
  @Permissions('membership.group.view')
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Get(':id/activity')
  @Permissions('membership.group.view')
  findActivity(@Param('id') id: string) {
    return this.groupsService.findActivity(id);
  }

  @Post()
  @Permissions('membership.group.create')
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @Permissions('membership.group.update')
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.update(id, dto, user);
  }

  @Put(':id/members')
  @Permissions('membership.group.update')
  setMembers(@Param('id') id: string, @Body() dto: SetGroupMembersDto) {
    return this.groupsService.setMembers(id, dto.memberIds);
  }

  @Post(':id/members/:memberId')
  @Permissions('membership.group.update')
  addMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.addMember(id, memberId, user);
  }

  @Delete(':id/members/:memberId')
  @Permissions('membership.group.update')
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.removeMember(id, memberId, user);
  }

  @Post(':id/notes')
  @Permissions('membership.group.update')
  addNote(@Param('id') id: string, @Body() dto: CreateGroupNoteDto, @CurrentUser() user: AuthUser) {
    return this.groupsService.addNote(id, dto, user);
  }

  @Post(':id/meetings')
  @Permissions('membership.group.update')
  logMeeting(
    @Param('id') id: string,
    @Body() dto: CreateGroupMeetingDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.logMeeting(id, dto, user);
  }

  @Post(':id/announcements')
  @Permissions('membership.group.update')
  postAnnouncement(
    @Param('id') id: string,
    @Body() dto: CreateGroupAnnouncementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.groupsService.postAnnouncement(id, dto, user);
  }

  @Delete(':id')
  @Permissions('membership.group.delete')
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }
}
