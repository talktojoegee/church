import { Module } from '@nestjs/common';
import { FinanceModule } from '../finance/finance.module';
import { HrService } from './hr.service';
import {
  EmployeesController,
  LeaveController,
  PayrollController,
} from './hr.controller';

@Module({
  imports: [FinanceModule],
  controllers: [EmployeesController, LeaveController, PayrollController],
  providers: [HrService],
  exports: [HrService],
})
export class HrModule {}
