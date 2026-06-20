import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { ServiceType } from '@prisma/client';

export class CreateSessionDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() branchId!: string;
  @IsEnum(ServiceType) type!: ServiceType;
  @IsDateString() date!: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maleCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) femaleCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) childrenCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) newcomerCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalCount?: number;
  @IsOptional() @IsString() notes?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) presentMemberIds?: string[];
}

export class UpdateSessionDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsEnum(ServiceType) type?: ServiceType;
  @IsOptional() @IsDateString() date?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) maleCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) femaleCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) childrenCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) newcomerCount?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) totalCount?: number;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) presentMemberIds?: string[];
}

export class AttendanceQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number = 20;
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsEnum(ServiceType) type?: ServiceType;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
}
