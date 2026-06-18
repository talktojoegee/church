import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { PublishStatus, SiteSectionType } from '@prisma/client';

export class CreateSiteSlideDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSiteSlideDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSitePageDto {
  @IsString() @MinLength(2) slug!: string;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsString() @MinLength(2) body!: string;
  @IsOptional() @IsEnum(PublishStatus) status?: PublishStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() metaDescription?: string;
}

export class UpdateSitePageDto {
  @IsOptional() @IsString() @MinLength(2) slug?: string;
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() @MinLength(2) body?: string;
  @IsOptional() @IsEnum(PublishStatus) status?: PublishStatus;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsString() metaDescription?: string;
}

export class CreateSiteSectionDto {
  @IsOptional() @IsString() pageSlug?: string;
  @IsOptional() @IsEnum(SiteSectionType) type?: SiteSectionType;
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSiteSectionDto {
  @IsOptional() @IsString() pageSlug?: string;
  @IsOptional() @IsEnum(SiteSectionType) type?: SiteSectionType;
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() subtitle?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() ctaLabel?: string;
  @IsOptional() @IsString() ctaUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class PublicContactDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MinLength(10) message!: string;
}

export class PublicTestimonyDto {
  @IsString() @MinLength(2) authorName!: string;
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(20) body!: string;
  @IsOptional() @IsString() categoryId?: string;
}

export class PublicEventRegisterDto {
  @IsString() @MinLength(2) guestName!: string;
  @IsOptional() @IsString() guestPhone?: string;
}

export class CreateSiteGalleryDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() caption?: string;
  @IsString() imageUrl!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateSiteGalleryDto {
  @IsOptional() @IsString() @MinLength(2) title?: string;
  @IsOptional() @IsString() caption?: string;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class UpdateGivingSettingsDto {
  @IsOptional() @IsString() givingIntro?: string;
  @IsOptional() @IsString() givingInstructions?: string;
  @IsOptional() @IsString() givingBankName?: string;
  @IsOptional() @IsString() givingAccountName?: string;
  @IsOptional() @IsString() givingAccountNumber?: string;
  @IsOptional() @IsBoolean() givingPaystackEnabled?: boolean;
  @IsOptional() @IsString() paystackPublicKey?: string;
  @IsOptional() @IsString() paystackSecretKey?: string;
}

export class PublicVerifyGivingDto {
  @IsString() reference!: string;
  @Type(() => Number) @IsNumber() @Min(100) amount!: number;
  @IsString() @MinLength(2) donorName!: string;
  @IsOptional() @IsEmail() email?: string;
}

export class UpdateAboutSettingsDto {
  @IsOptional() @IsString() pastorName?: string;
  @IsOptional() @IsString() pastorTitle?: string;
  @IsOptional() @IsString() pastorBio?: string;
  @IsOptional() @IsString() pastorPhotoUrl?: string;
  @IsOptional() @IsString() aboutFounded?: string;
  @IsOptional() @IsString() aboutStory?: string;
  @IsOptional() @IsString() aboutBeliefs?: string;
  @IsOptional() @IsString() aboutValues?: string;
}
