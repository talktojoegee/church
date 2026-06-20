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
} from 'class-validator';
import {
  EmployeeStatus,
  EmploymentType,
  LeaveStatus,
  LeaveType,
  PayRunStatus,
  SalaryComponentType,
} from '@prisma/client';

// --- Employees ---
export class CreateEmployeeDto {
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsString() branchId!: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateEmployeeDto {
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() userId?: string | null;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() position?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsDateString() hireDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) baseSalary?: number;
  @IsOptional() @IsString() bankName?: string;
  @IsOptional() @IsString() bankAccountNo?: string;
  @IsOptional() @IsString() bankAccountName?: string;
  @IsOptional() @IsString() notes?: string;
}

export class SalaryComponentDto {
  @IsString() name!: string;
  @IsEnum(SalaryComponentType) type!: SalaryComponentType;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsBoolean() isPercentage?: boolean;
  @IsOptional() @IsString() givingTypeId?: string;
}

export class SetComponentsDto {
  @IsArray() components!: SalaryComponentDto[];
}

export class EmployeeQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(EmployeeStatus) status?: EmployeeStatus;
  @IsOptional() @IsEnum(EmploymentType) employmentType?: EmploymentType;
}

// --- Leave ---
export class CreateLeaveDto {
  @IsString() employeeId!: string;
  @IsEnum(LeaveType) type!: LeaveType;
  @IsDateString() startDate!: string;
  @IsDateString() endDate!: string;
  @Type(() => Number) @IsInt() @Min(1) days!: number;
  @IsOptional() @IsString() reason?: string;
}

export class ReviewLeaveDto {
  @IsEnum(LeaveStatus) status!: LeaveStatus;
  @IsOptional() @IsString() reviewNote?: string;
}

export class LeaveQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() employeeId?: string;
  @IsOptional() @IsEnum(LeaveStatus) status?: LeaveStatus;
  @IsOptional() @IsEnum(LeaveType) type?: LeaveType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

// --- Payroll ---
export class CreatePayRunDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() period!: string; // YYYY-MM
  @IsOptional() @IsArray() @IsString({ each: true }) employeeIds?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePayRunDto {
  @IsOptional() @IsEnum(PayRunStatus) status?: PayRunStatus;
  @IsOptional() @IsString() notes?: string;
}

export class PayRunQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsEnum(PayRunStatus) status?: PayRunStatus;
  @IsOptional() @IsString() period?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() from?: string;
  @IsOptional() @IsDateString() to?: string;
}

export class CreatePeriodAdjustmentDto {
  @IsString() branchId!: string;
  @IsString() period!: string;
  @IsString() employeeId!: string;
  @IsString() name!: string;
  @IsEnum(SalaryComponentType) type!: SalaryComponentType;
  @Type(() => Number) @IsNumber() @Min(0) amount!: number;
  @IsOptional() @IsString() givingTypeId?: string;
}

export class PeriodAdjustmentQueryDto {
  @IsString() branchId!: string;
  @IsString() period!: string;
}
