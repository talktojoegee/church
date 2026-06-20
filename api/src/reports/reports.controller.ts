import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportsDataService } from './reports-data.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly reports: ReportsService,
    private readonly reportData: ReportsDataService,
  ) {}

  @Get('overview')
  @Permissions('reports.report.view')
  overview(@Query('branchId') branchId?: string) {
    return this.reports.overview(branchId);
  }

  @Get('membership-growth')
  @Permissions('reports.report.view')
  membershipGrowth(@Query('branchId') branchId?: string) {
    return this.reports.membershipGrowth(branchId);
  }

  @Get('finance')
  @Permissions('reports.report.view')
  finance(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reports.financeReport(branchId, from, to);
  }

  @Get('data')
  @Permissions('reports.report.view')
  data(@Query() query: ReportQueryDto) {
    return this.reportData.getReportData(query);
  }

  @Get('export')
  @Permissions('reports.report.view')
  async export(@Query() query: ReportQueryDto, @Res() res: Response) {
    const { buffer, filename } = await this.reportData.exportReportExcel(query);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  /** @deprecated Use GET /reports/export?type=members */
  @Get('export/members')
  @Permissions('reports.report.view')
  async exportMembers(@Query('branchId') branchId: string | undefined, @Res() res: Response) {
    const { buffer, filename } = await this.reportData.exportReportExcel({
      type: 'members',
      branchId,
    });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }

  /** @deprecated Use GET /reports/export?type=contributions */
  @Get('export/contributions')
  @Permissions('reports.report.view')
  async exportContributions(
    @Query('branchId') branchId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res() res: Response,
  ) {
    const { buffer, filename } = await this.reportData.exportReportExcel({
      type: 'contributions',
      branchId,
      from,
      to,
    });
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
