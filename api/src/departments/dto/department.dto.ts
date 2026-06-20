import { IsArray, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { DepartmentMemberRole } from '@prisma/client';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  branchId!: string;

  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() leaderId?: string;
}

export class UpdateDepartmentDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() parentId?: string;
  @IsOptional() @IsString() leaderId?: string;
  @IsOptional() isActive?: boolean;
}

export class SetDepartmentMembersDto {
  @IsArray() @IsString({ each: true }) memberIds!: string[];
}

export class AssignDepartmentRoleDto {
  @IsEnum(DepartmentMemberRole) role!: DepartmentMemberRole;
}

export class PublishDepartmentAnnouncementDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) message!: string;
  @IsOptional() @IsString() channel?: 'EMAIL' | 'SMS' | 'BOTH';
}
