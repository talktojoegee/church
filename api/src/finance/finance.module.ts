import { Module } from '@nestjs/common';
import { FinanceService } from './finance.service';
import {
  ContributionsController,
  ExpenseCategoriesController,
  ExpensesController,
  FinanceImportController,
  FinanceSummaryController,
  FundsController,
  GivingTypesController,
  PledgesController,
} from './finance.controller';

@Module({
  controllers: [
    FundsController,
    FinanceImportController,
    ContributionsController,
    ExpensesController,
    PledgesController,
    FinanceSummaryController,
    GivingTypesController,
    ExpenseCategoriesController,
  ],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}
