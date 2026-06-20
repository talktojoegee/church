import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { PERMISSIONS } from '@chms/shared';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto } from '../common/pagination';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(...PERMISSIONS.user.filter((p) => p.endsWith('.view')))
  findMany(@Query() query: PaginationDto) {
    return this.usersService.findMany(query);
  }

  @Get(':id')
  @Permissions(...PERMISSIONS.user.filter((p) => p.endsWith('.view')))
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Permissions(...PERMISSIONS.user.filter((p) => p.endsWith('.create')))
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Permissions(...PERMISSIONS.user.filter((p) => p.endsWith('.update')))
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(...PERMISSIONS.user.filter((p) => p.endsWith('.delete')))
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
