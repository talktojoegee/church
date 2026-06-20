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
import { DepartmentsService } from './departments.service';
import {
  AssignDepartmentRoleDto,
  CreateDepartmentDto,
  PublishDepartmentAnnouncementDto,
  SetDepartmentMembersDto,
  UpdateDepartmentDto,
} from './dto/department.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Get()
  @Permissions('org.department.view')
  findMany(@Query('branchId') branchId?: string) {
    return this.departmentsService.findMany(branchId);
  }

  @Get(':id')
  @Permissions('org.department.view')
  findOne(@Param('id') id: string) {
    return this.departmentsService.findOne(id);
  }

  @Post()
  @Permissions('org.department.create')
  create(@Body() dto: CreateDepartmentDto) {
    return this.departmentsService.create(dto);
  }

  @Patch(':id')
  @Permissions('org.department.update')
  update(@Param('id') id: string, @Body() dto: UpdateDepartmentDto) {
    return this.departmentsService.update(id, dto);
  }

  @Put(':id/members')
  @Permissions('org.department.update')
  setMembers(@Param('id') id: string, @Body() dto: SetDepartmentMembersDto) {
    return this.departmentsService.setMembers(id, dto.memberIds ?? []);
  }

  @Post(':id/members/:memberId')
  @Permissions('org.department.update')
  addMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.departmentsService.addMember(id, memberId);
  }

  @Delete(':id/members/:memberId')
  @Permissions('org.department.update')
  removeMember(@Param('id') id: string, @Param('memberId') memberId: string) {
    return this.departmentsService.removeMember(id, memberId);
  }

  @Patch(':id/members/:memberId/role')
  @Permissions('org.department.update')
  assignRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: AssignDepartmentRoleDto,
  ) {
    return this.departmentsService.assignRole(id, memberId, dto);
  }

  @Post(':id/announcements')
  @Permissions('org.department.update')
  publishAnnouncement(
    @Param('id') id: string,
    @Body() dto: PublishDepartmentAnnouncementDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.departmentsService.publishAnnouncement(id, dto, user.id);
  }

  @Delete(':id')
  @Permissions('org.department.delete')
  remove(@Param('id') id: string) {
    return this.departmentsService.remove(id);
  }
}
