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
import { AttendanceService } from './attendance.service';
import {
  AttendanceQueryDto,
  CreateSessionDto,
  UpdateSessionDto,
} from './dto/attendance.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Permissions('engagement.attendance.view')
  findMany(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.findMany(query);
  }

  @Get('stats')
  @Permissions('engagement.attendance.view')
  stats(@Query() query: AttendanceQueryDto) {
    return this.attendanceService.stats(query);
  }

  @Get(':id')
  @Permissions('engagement.attendance.view')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Post()
  @Permissions('engagement.attendance.create')
  create(@Body() dto: CreateSessionDto, @CurrentUser() user: AuthUser) {
    return this.attendanceService.create(dto, user.id);
  }

  @Patch(':id')
  @Permissions('engagement.attendance.update')
  update(@Param('id') id: string, @Body() dto: UpdateSessionDto) {
    return this.attendanceService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('engagement.attendance.delete')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }
}
