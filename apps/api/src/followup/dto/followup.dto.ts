import {
  IsArray,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { FollowUpRecipientStatus, FollowUpStatus, FollowUpType } from '@prisma/client';

export class CreateFollowUpDto {
  @IsString() branchId!: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsEnum(FollowUpType) type!: FollowUpType;
  @IsOptional() @IsEnum(FollowUpStatus) status?: FollowUpStatus;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateFollowUpDto {
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() contactName?: string;
  @IsOptional() @IsString() contactPhone?: string;
  @IsOptional() @IsEnum(FollowUpType) type?: FollowUpType;
  @IsOptional() @IsEnum(FollowUpStatus) status?: FollowUpStatus;
  @IsOptional() @IsString() assignedToId?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class CreateFollowUpCampaignDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() objective?: string;
  @IsEnum(FollowUpType) type!: FollowUpType;
  @IsOptional() @IsDateString() dueDate?: string;
  @IsOptional() @IsString() notes?: string;
  @IsArray() @IsString({ each: true }) memberIds!: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) assigneeIds?: string[];
}

export class UpdateFollowUpRecipientDto {
  @IsOptional() @IsEnum(FollowUpRecipientStatus) status?: FollowUpRecipientStatus;
  @IsOptional() @IsString() note?: string;
}

export class SendFollowUpMessageDto {
  @IsOptional() @IsString() message?: string;
  @IsOptional() @IsString() subject?: string;
}
