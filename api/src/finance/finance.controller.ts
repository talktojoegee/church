import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import type { AuthUser } from '@chms/shared';
import { FinanceService } from './finance.service';
import {
  CreateContributionDto,
  CreateExpenseCategoryDto,
  CreateExpenseDto,
  CreateFundDto,
  CreateGivingTypeDto,
  CreatePledgeDto,
  FinanceQueryDto,
  UpdateContributionDto,
  UpdateExpenseCategoryDto,
  UpdateExpenseDto,
  UpdateFundDto,
  UpdateGivingTypeDto,
  UpdatePledgeDto,
  CommitStatementImportDto,
} from './dto/finance.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('finance/funds')
export class FundsController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.fund.view')
  list(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.listFunds(branchId, from, to);
  }
  @Get('stats') @Permissions('finance.fund.view')
  stats(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.fundStats(branchId, from, to);
  }
  @Post() @Permissions('finance.fund.create')
  create(@Body() dto: CreateFundDto) {
    return this.finance.createFund(dto);
  }
  @Patch(':id') @Permissions('finance.fund.update')
  update(@Param('id') id: string, @Body() dto: UpdateFundDto) {
    return this.finance.updateFund(id, dto);
  }
  @Delete(':id') @Permissions('finance.fund.delete')
  remove(@Param('id') id: string) {
    return this.finance.removeFund(id);
  }
}

@Controller('finance/import')
export class FinanceImportController {
  constructor(private readonly finance: FinanceService) {}

  @Get('template')
  @Permissions('finance.contribution.create')
  async template(@Res() res: Response) {
    const buf = await this.finance.generateImportTemplate();
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="finance-import-template.xlsx"',
    });
    res.send(buf);
  }

  @Post('preview')
  @Permissions('finance.contribution.create')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File,
    @Body('fundId') fundId: string,
    @Body('branchId') branchId: string,
  ) {
    if (!file?.buffer?.length) {
      return { format: 'generic', rows: [], stats: { total: 0, duplicates: 0, income: 0, expense: 0, incomeAmount: 0, expenseAmount: 0 }, error: 'No file uploaded' };
    }
    return this.finance.previewStatementImport(file.buffer, fundId, branchId);
  }

  @Post('commit')
  @Permissions('finance.contribution.create')
  commit(@Body() dto: CommitStatementImportDto, @CurrentUser() user: AuthUser) {
    return this.finance.commitStatementImport(dto, user.id);
  }
}

@Controller('finance/contributions')
export class ContributionsController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.contribution.view')
  list(@Query() query: FinanceQueryDto) {
    return this.finance.listContributions(query);
  }
  @Get('stats') @Permissions('finance.contribution.view')
  stats(@Query() query: FinanceQueryDto) {
    return this.finance.contributionStats(query);
  }
  @Get(':id/receipt') @Permissions('finance.contribution.view')
  async receipt(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.finance.generateReceiptPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
    });
    res.send(pdf);
  }
  @Post() @Permissions('finance.contribution.create')
  create(@Body() dto: CreateContributionDto, @CurrentUser() user: AuthUser) {
    return this.finance.createContribution(dto, user.id);
  }
  @Patch(':id') @Permissions('finance.contribution.update')
  update(@Param('id') id: string, @Body() dto: UpdateContributionDto, @CurrentUser() user: AuthUser) {
    return this.finance.updateContribution(id, dto, user.id);
  }
  @Delete(':id') @Permissions('finance.contribution.delete')
  remove(@Param('id') id: string) {
    return this.finance.removeContribution(id);
  }
}

@Controller('finance/expenses')
export class ExpensesController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.expense.view')
  list(@Query() query: FinanceQueryDto) {
    return this.finance.listExpenses(query);
  }
  @Get('stats') @Permissions('finance.expense.view')
  stats(@Query() query: FinanceQueryDto) {
    return this.finance.expenseStats(query);
  }
  @Get(':id/voucher') @Permissions('finance.expense.view')
  async voucher(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.finance.generateExpenseVoucherPdf(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="expense-voucher-${id}.pdf"`,
    });
    res.send(pdf);
  }
  @Post() @Permissions('finance.expense.create')
  create(@Body() dto: CreateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.finance.createExpense(dto, user.id);
  }
  @Patch(':id') @Permissions('finance.expense.update')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseDto, @CurrentUser() user: AuthUser) {
    return this.finance.updateExpense(id, dto, user.id);
  }
  @Delete(':id') @Permissions('finance.expense.delete')
  remove(@Param('id') id: string) {
    return this.finance.removeExpense(id);
  }
}

@Controller('finance/pledges')
export class PledgesController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.pledge.view')
  list(@Query('branchId') branchId?: string) {
    return this.finance.listPledges(branchId);
  }
  @Get('stats') @Permissions('finance.pledge.view')
  stats(@Query('branchId') branchId?: string) {
    return this.finance.pledgeStats(branchId);
  }
  @Post() @Permissions('finance.pledge.create')
  create(@Body() dto: CreatePledgeDto, @CurrentUser() user: AuthUser) {
    return this.finance.createPledge(dto, user.id);
  }
  @Patch(':id') @Permissions('finance.pledge.update')
  update(@Param('id') id: string, @Body() dto: UpdatePledgeDto, @CurrentUser() user: AuthUser) {
    return this.finance.updatePledge(id, dto, user.id);
  }
  @Delete(':id') @Permissions('finance.pledge.delete')
  remove(@Param('id') id: string) {
    return this.finance.removePledge(id);
  }
}

@Controller('finance/summary')
export class FinanceSummaryController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.contribution.view')
  summary(
    @Query('branchId') branchId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.finance.summary(branchId, from, to);
  }
}

@Controller('finance/giving-types')
export class GivingTypesController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.contribution.view')
  list(@Query('branchId') branchId?: string) {
    return this.finance.listGivingTypes(branchId);
  }
  @Post() @Permissions('finance.contribution.create')
  create(@Body() dto: CreateGivingTypeDto) {
    return this.finance.createGivingType(dto);
  }
  @Patch(':id') @Permissions('finance.contribution.update')
  update(@Param('id') id: string, @Body() dto: UpdateGivingTypeDto) {
    return this.finance.updateGivingType(id, dto);
  }
  @Delete(':id') @Permissions('finance.contribution.delete')
  remove(@Param('id') id: string) {
    return this.finance.removeGivingType(id);
  }
}

@Controller('finance/expense-categories')
export class ExpenseCategoriesController {
  constructor(private readonly finance: FinanceService) {}

  @Get() @Permissions('finance.expense.view')
  list(@Query('branchId') branchId?: string) {
    return this.finance.listExpenseCategories(branchId);
  }
  @Post() @Permissions('finance.expense.create')
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.finance.createExpenseCategory(dto);
  }
  @Patch(':id') @Permissions('finance.expense.update')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.finance.updateExpenseCategory(id, dto);
  }
  @Delete(':id') @Permissions('finance.expense.delete')
  remove(@Param('id') id: string) {
    return this.finance.removeExpenseCategory(id);
  }
}
