import { MessageChannel } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CreateTemplateDto {
  @IsString() @MinLength(2) name!: string;
  @IsEnum(MessageChannel) channel!: MessageChannel;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() category?: string;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsEnum(MessageChannel) channel?: MessageChannel;
  @IsOptional() @IsString() subject?: string;
  @IsOptional() @IsString() body?: string;
  @IsOptional() @IsString() category?: string;
}

class RecipientDto {
  @IsOptional() @IsString() memberId?: string;
  @IsOptional() @IsString() name?: string;
  @IsString() address!: string;
}

export class SendMessageDto {
  @IsString() branchId!: string;
  @IsEnum(MessageChannel) channel!: MessageChannel;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) memberIds?: string[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients?: RecipientDto[];
}
