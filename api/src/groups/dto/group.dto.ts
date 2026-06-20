import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateGroupDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() branchId!: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() leaderId?: string;
  @IsOptional() @IsString() meetingDay?: string;
  @IsOptional() @IsString() meetingTime?: string;
  @IsOptional() @IsString() location?: string;
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() category?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() leaderId?: string;
  @IsOptional() @IsString() meetingDay?: string;
  @IsOptional() @IsString() meetingTime?: string;
  @IsOptional() @IsString() location?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class SetGroupMembersDto {
  @IsArray() @IsString({ each: true }) memberIds!: string[];
}

export class CreateGroupNoteDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() body?: string;
}

export class CreateGroupMeetingDto {
  @IsString() @MinLength(2) title!: string;
  @IsOptional() @IsString() topic?: string;
  @IsDateString() heldAt!: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attendeeIds?: string[];
}

export class CreateGroupAnnouncementDto {
  @IsString() @MinLength(2) title!: string;
  @IsString() @MinLength(2) body!: string;
}
