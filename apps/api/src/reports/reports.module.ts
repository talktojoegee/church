import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsDataService } from './reports-data.service';
import { AttendanceModule } from '../attendance/attendance.module';
import { MembersModule } from '../members/members.module';
import { FinanceModule } from '../finance/finance.module';

@Module({
  imports: [AttendanceModule, MembersModule, FinanceModule],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsDataService],
  exports: [ReportsService, ReportsDataService],
})
export class ReportsModule {}
