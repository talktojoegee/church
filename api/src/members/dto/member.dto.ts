import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import {
  Gender,
  HouseholdRole,
  MaritalStatus,
  MemberStatus,
  PastoralRole,
} from '@prisma/client';
import { EmptyToUndefined } from '../../common/transforms';

export class CreateMemberDto {
  @IsString() @MinLength(1) firstName!: string;
  @IsString() @MinLength(1) lastName!: string;
  @IsString() branchId!: string;

  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsEnum(MemberStatus) status?: MemberStatus;
  @IsOptional() @IsEnum(PastoralRole) pastoralRole?: PastoralRole;
  @IsOptional() @IsEnum(HouseholdRole) householdRole?: HouseholdRole;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() employer?: string;
  @IsOptional() @IsString() photoUrl?: string;

  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsDateString() baptismDate?: string;
  @IsOptional() @IsBoolean() isBaptizedWater?: boolean;
  @IsOptional() @IsBoolean() isBaptizedSpirit?: boolean;

  @IsOptional() @IsString() emergencyName?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() householdId?: string;

  @IsOptional() @IsArray() @IsString({ each: true }) departmentIds?: string[];
}

export class UpdateMemberDto {
  @IsOptional() @IsString() @MinLength(1) firstName?: string;
  @IsOptional() @IsString() @MinLength(1) lastName?: string;
  @IsOptional() @IsString() middleName?: string;
  @IsOptional() @IsEnum(Gender) gender?: Gender;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsEnum(MaritalStatus) maritalStatus?: MaritalStatus;
  @IsOptional() @IsEnum(MemberStatus) status?: MemberStatus;
  @IsOptional() @IsEnum(PastoralRole) pastoralRole?: PastoralRole;
  @IsOptional() @IsEnum(HouseholdRole) householdRole?: HouseholdRole;

  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() altPhone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @IsString() occupation?: string;
  @IsOptional() @IsString() employer?: string;
  @IsOptional() @IsString() photoUrl?: string;

  @IsOptional() @IsDateString() joinedAt?: string;
  @IsOptional() @IsDateString() baptismDate?: string;
  @IsOptional() @IsBoolean() isBaptizedWater?: boolean;
  @IsOptional() @IsBoolean() isBaptizedSpirit?: boolean;

  @IsOptional() @IsString() emergencyName?: string;
  @IsOptional() @IsString() emergencyPhone?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() householdId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;

  @IsOptional() @IsArray() @IsString({ each: true }) departmentIds?: string[];
}

export class MemberQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() page?: number = 1;
  @IsOptional() @Type(() => Number) @IsInt() pageSize?: number = 20;
  @IsOptional() @EmptyToUndefined() @IsString() search?: string;
  @IsOptional() @EmptyToUndefined() @IsString() branchId?: string;
  @IsOptional() @EmptyToUndefined() @IsEnum(MemberStatus) status?: MemberStatus;
  @IsOptional() @EmptyToUndefined() @IsString() departmentId?: string;
  @IsOptional() @EmptyToUndefined() @IsEnum(PastoralRole) pastoralRole?: PastoralRole;
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  pastorsOnly?: boolean;
}

export class CreateLifeEventDto {
  @IsString() title!: string;
  @IsString() type!: string;
  @IsDateString() eventDate!: string;
  @IsOptional() @IsString() description?: string;
}
