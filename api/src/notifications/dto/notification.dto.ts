import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/pagination';

export class NotificationQueryDto extends PaginationDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  unreadOnly?: boolean;
}

export class RegisterDeviceTokenDto {
  @IsString()
  token!: string;

  @IsString()
  @IsIn(['ios', 'android', 'web', 'macos'])
  platform!: string;
}

export class UnregisterDeviceTokenDto {
  @IsString()
  token!: string;
}

export class CreateNotificationDto {
  @IsString()
  userId!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  link?: string;
}
