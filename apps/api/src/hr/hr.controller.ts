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
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthUser } from '@chms/shared';
import { HrService } from './hr.service';
import {
  CreateEmployeeDto,
  CreateLeaveDto,
  CreatePayRunDto,
  CreatePeriodAdjustmentDto,
  EmployeeQueryDto,
  LeaveQueryDto,
  PayRunQueryDto,
  PeriodAdjustmentQueryDto,
  ReviewLeaveDto,
  SetComponentsDto,
  UpdateEmployeeDto,
  UpdatePayRunDto,
} from './dto/hr.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('hr/employees')
export class EmployeesController {
  constructor(private readonly hr: HrService) {}

  @Get('stats') @Permissions('hr.employee.view')
  stats(@Query() query: EmployeeQueryDto) {
    return this.hr.stats(query);
  }
  @Get() @Permissions('hr.employee.view')
  list(@Query() query: EmployeeQueryDto) {
    return this.hr.listEmployees(query);
  }
  @Get(':id/payroll-export') @Permissions('hr.employee.view')
  async exportPayrollLog(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.hr.exportPayrollLogExcel(id);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="payroll-log-${id}.xlsx"`,
    });
    res.send(buffer);
  }
  @Get(':id') @Permissions('hr.employee.view')
  get(@Param('id') id: string) {
    return this.hr.getEmployee(id);
  }
  @Post() @Permissions('hr.employee.create')
  create(@Body() dto: CreateEmployeeDto) {
    return this.hr.createEmployee(dto);
  }
  @Patch(':id') @Permissions('hr.employee.update')
  update(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.hr.updateEmployee(id, dto);
  }
  @Put(':id/components') @Permissions('hr.employee.update')
  setComponents(@Param('id') id: string, @Body() dto: SetComponentsDto) {
    return this.hr.setComponents(id, dto.components);
  }
  @Delete(':id') @Permissions('hr.employee.delete')
  remove(@Param('id') id: string) {
    return this.hr.removeEmployee(id);
  }
}

@Controller('hr/leave')
export class LeaveController {
  constructor(private readonly hr: HrService) {}

  @Get('stats') @Permissions('hr.leave.view')
  stats(@Query() query: LeaveQueryDto) {
    return this.hr.leaveStats(query);
  }
  @Get() @Permissions('hr.leave.view')
  list(@Query() query: LeaveQueryDto) {
    return this.hr.listLeave(query);
  }
  @Post() @Permissions('hr.leave.create')
  create(@Body() dto: CreateLeaveDto) {
    return this.hr.createLeave(dto);
  }
  @Patch(':id/review') @Permissions('hr.leave.manage')
  review(@Param('id') id: string, @Body() dto: ReviewLeaveDto, @CurrentUser() user: AuthUser) {
    return this.hr.reviewLeave(id, dto, user.id);
  }
  @Delete(':id') @Permissions('hr.leave.delete')
  remove(@Param('id') id: string) {
    return this.hr.removeLeave(id);
  }
}

@Controller('hr/payroll')
export class PayrollController {
  constructor(private readonly hr: HrService) {}

  @Get('stats') @Permissions('payroll.payroll.view')
  stats(@Query() query: PayRunQueryDto) {
    return this.hr.payrollStats(query);
  }
  @Get('period-adjustments') @Permissions('payroll.payroll.view')
  listPeriodAdjustments(@Query() query: PeriodAdjustmentQueryDto) {
    return this.hr.listPeriodAdjustments(query);
  }
  @Post('period-adjustments') @Permissions('payroll.payroll.manage')
  createPeriodAdjustment(@Body() dto: CreatePeriodAdjustmentDto) {
    return this.hr.createPeriodAdjustment(dto);
  }
  @Delete('period-adjustments/:adjId') @Permissions('payroll.payroll.manage')
  removePeriodAdjustment(@Param('adjId') adjId: string) {
    return this.hr.removePeriodAdjustment(adjId);
  }
  @Get() @Permissions('payroll.payroll.view')
  list(@Query() query: PayRunQueryDto) {
    return this.hr.listPayRuns(query);
  }
  @Get(':id') @Permissions('payroll.payroll.view')
  get(@Param('id') id: string) {
    return this.hr.getPayRun(id);
  }
  @Post() @Permissions('payroll.payroll.create')
  create(@Body() dto: CreatePayRunDto, @CurrentUser() user: AuthUser) {
    return this.hr.createPayRun(dto, user.id);
  }
  @Post(':id/recalculate') @Permissions('payroll.payroll.manage')
  recalculate(@Param('id') id: string) {
    return this.hr.recalculatePayRun(id);
  }
  @Patch(':id') @Permissions('payroll.payroll.manage')
  update(@Param('id') id: string, @Body() dto: UpdatePayRunDto, @CurrentUser() user: AuthUser) {
    return this.hr.updatePayRun(id, dto, user.id);
  }
  @Delete(':id') @Permissions('payroll.payroll.delete')
  remove(@Param('id') id: string) {
    return this.hr.removePayRun(id);
  }
}
