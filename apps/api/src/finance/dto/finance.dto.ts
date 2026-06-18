import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { PaymentMethod, PledgeStatus, FinanceAccountType } from '@prisma/client';

// --- Funds (finance accounts) ---
export class CreateFundDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() branchId!: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(FinanceAccountType) accountType?: FinanceAccountType;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() openingBalance?: number;
  @IsOptional() @IsDateString() openingBalanceDate?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}
export class UpdateFundDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsEnum(FinanceAccountType) accountType?: FinanceAccountType;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() accountNumber?: string;
  @IsOptional() @Type(() => Number) @IsNumber() openingBalance?: number;
  @IsOptional() @IsDateString() openingBalanceDate?: string;
  @IsOptional() @IsBoolean() isDefault?: boolean;
}

// --- Giving types ---
export class CreateGivingTypeDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateGivingTypeDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

// --- Expense categories ---
export class CreateExpenseCategoryDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateExpenseCategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

// --- Contributions ---
export class CreateContributionDto {
  @IsString() branchId!: string;
  @IsString() givingTypeId!: string;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsDateString() contributedAt!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() note?: string;
}
export class UpdateContributionDto {
  @IsOptional() @IsString() givingTypeId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() contributedAt?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() note?: string;
}

// --- Expenses ---
export class CreateExpenseDto {
  @IsString() branchId!: string;
  @IsString() categoryId!: string;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsDateString() expenseDate!: string;
  @IsEnum(PaymentMethod) paymentMethod!: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() paidTo?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() description?: string;
}
export class UpdateExpenseDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @IsDateString() expenseDate?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
  @IsOptional() @IsString() paidTo?: string;
  @IsOptional() @IsString() reference?: string;
  @IsOptional() @IsString() description?: string;
}

// --- Pledges ---
export class CreatePledgeDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) campaign!: string;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amountReceived?: number;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
}
export class UpdatePledgeDto {
  @IsOptional() @IsString() @MinLength(2) campaign?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) amount?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) fulfilledAmount?: number;
  @IsOptional() @IsEnum(PledgeStatus) status?: PledgeStatus;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() note?: string;
  @IsOptional() @IsEnum(PaymentMethod) paymentMethod?: PaymentMethod;
  @IsOptional() @IsString() fundId?: string;
}

// --- Queries ---
export class FinanceQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number = 20;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() givingTypeId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

// --- Statement import ---
export class StatementImportPreviewDto {
  @IsString() fundId!: string;
  @IsString() branchId!: string;
}

export class CommitImportRowDto {
  @Type(() => Number) @IsInt() rowNumber!: number;
  @IsDateString() date!: string;
  @IsString() description!: string;
  @IsString() kind!: 'income' | 'expense';
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() transactionRef?: string;
  @IsOptional() @IsString() givingTypeId?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsBoolean() skip?: boolean;
}

export class CommitStatementImportDto {
  @IsString() fundId!: string;
  @IsString() branchId!: string;
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommitImportRowDto)
  rows!: CommitImportRowDto[];
}
