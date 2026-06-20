import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateChurchDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() locale?: string;
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsString() logoUrl?: string;
}

export class UpsertSettingDto {
  @IsString() key!: string;
  @IsString() value!: string;
}
