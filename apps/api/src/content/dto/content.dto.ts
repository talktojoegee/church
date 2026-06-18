import { Type } from 'class-transformer';
import {
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
import { EventStatus, OutreachStatus, TestimonyStatus } from '@prisma/client';

// --- Sermons ---
export class CreateSermonDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() speaker?: string;
  @IsOptional() @IsString() seriesId?: string;
  @IsOptional() @IsString() scripture?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() audioUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsDateString() preachedAt?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}
export class UpdateSermonDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() speaker?: string;
  @IsOptional() @IsString() seriesId?: string;
  @IsOptional() @IsString() scripture?: string;
  @IsOptional() @IsString() summary?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() audioUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsDateString() preachedAt?: string;
  @IsOptional() @IsString() tags?: string;
  @IsOptional() @IsBoolean() isPublished?: boolean;
}

export class SermonQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsString() seriesId?: string;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

export class CreateSermonSeriesDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateSermonSeriesDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

// --- Testimonies ---
export class CreateTestimonyDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) body!: string;
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() authorName?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsDateString() occurredAt?: string;
}
export class UpdateTestimonyDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() @MinLength(2) body?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsBoolean() isFeatured?: boolean;
  @IsOptional() @IsDateString() occurredAt?: string;
}
export class ReviewTestimonyDto {
  @IsEnum(TestimonyStatus) status!: TestimonyStatus;
}

export class TestimonyQueryDto {
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(TestimonyStatus) status?: TestimonyStatus;
  @IsOptional() @IsString() categoryId?: string;
}

export class CreateTestimonyCategoryDto {
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateTestimonyCategoryDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

// --- Events ---
export class CreateEventDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsDateString() startAt!: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsBoolean() isAllDay?: boolean;
}
export class UpdateEventDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) capacity?: number;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsBoolean() isAllDay?: boolean;
}
export class RegisterEventDto {
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() guestName?: string;
  @IsOptional() @IsString() guestPhone?: string;
}

export class EventQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(EventStatus) status?: EventStatus;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string;
}

// --- Outreaches ---
export class CreateOutreachDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() typeId?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsEnum(OutreachStatus) status?: OutreachStatus;
  @IsOptional() @IsString() coordinator?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) peopleReached?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) souls?: number;
  @IsOptional() @IsString() outcome?: string;
}
export class UpdateOutreachDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() typeId?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() startAt?: string;
  @IsOptional() @IsDateString() endAt?: string;
  @IsOptional() @IsEnum(OutreachStatus) status?: OutreachStatus;
  @IsOptional() @IsString() coordinator?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) budget?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) peopleReached?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) souls?: number;
  @IsOptional() @IsString() outcome?: string;
}

export class OutreachQueryDto {
  @IsOptional() @IsString() branchId?: string;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(OutreachStatus) status?: OutreachStatus;
  @IsOptional() @IsString() typeId?: string;
  @IsOptional() @IsString() state?: string;
}

export class CreateOutreachTypeDto {
  @IsString() branchId!: string;
  @IsString() @MinLength(2) name!: string;
  @IsOptional() @IsString() description?: string;
}

export class UpdateOutreachTypeDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
}

export class AddOutreachImageDto {
  @IsString() url!: string;
  @IsOptional() @IsString() caption?: string;
}
