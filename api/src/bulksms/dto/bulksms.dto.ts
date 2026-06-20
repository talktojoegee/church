import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { BulkSmsRecurrence } from '@prisma/client';

export class PhoneGroupDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() phoneNumbers!: string;
  @IsOptional() @IsString() branchId?: string;
}

export class UpdatePhoneGroupDto {
  @IsString() @MinLength(2) @MaxLength(100) name!: string;
  @IsString() phoneNumbers!: string;
}

export class SenderIdDto {
  @IsString() @MinLength(2) @MaxLength(11) senderId!: string;
  @IsString() @MinLength(5) purpose!: string;
  @IsOptional() @IsString() branchId?: string;
}

export class PreviewBulkSmsDto {
  @IsString() @MinLength(1) message!: string;
  @IsString() senderId!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) phoneGroupIds?: string[];
  @IsOptional() @IsString() phoneNumbers?: string;
  @IsOptional() @IsString() branchId?: string;
}

export class SendBulkSmsDto extends PreviewBulkSmsDto {
  @Type(() => Number) @IsNumber() @Min(0) retailPrice!: number;
  @Type(() => Number) @IsInt() @Min(1) pages!: number;
  @Type(() => Number) @IsInt() @Min(1) persons!: number;
  @IsString() phoneNumbersResolved!: string;
}

export class ScheduleBulkSmsDto extends PreviewBulkSmsDto {
  @IsDateString() scheduledAt!: string;
  @IsEnum(BulkSmsRecurrence) recurrence!: BulkSmsRecurrence;
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  recurrenceDays?: number[];
}

export class VerifyWalletTopUpDto {
  @IsString() reference!: string;
  @Type(() => Number) @IsNumber() @Min(100) amount!: number;
  @IsOptional() @IsString() branchId?: string;
}
