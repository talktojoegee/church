import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export const REPORT_TYPES = [
  'members',
  'groups',
  'follow-ups',
  'attendance',
  'events',
  'outreaches',
  'contributions',
  'expenses',
  'pledges',
  'employees',
  'leave',
  'payroll',
  'bulk-sms',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export class ReportQueryDto {
  @IsString()
  @IsIn([...REPORT_TYPES])
  type!: ReportType;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
