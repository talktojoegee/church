import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PERMISSIONS } from '@chms/shared';
import { RolesService } from './roles.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

const VIEW = PERMISSIONS.role.filter((p) => p.endsWith('.view'));
const CREATE = PERMISSIONS.role.filter((p) => p.endsWith('.create'));
const UPDATE = PERMISSIONS.role.filter((p) => p.endsWith('.update'));
const DELETE = PERMISSIONS.role.filter((p) => p.endsWith('.delete'));

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Permissions(...VIEW)
  findMany() {
    return this.rolesService.findMany();
  }

  @Get('permissions')
  @Permissions(...VIEW)
  listPermissions() {
    return this.rolesService.listPermissions();
  }

  @Get(':id')
  @Permissions(...VIEW)
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Post()
  @Permissions(...CREATE)
  create(@Body() dto: CreateRoleDto) {
    return this.rolesService.create(dto);
  }

  @Patch(':id')
  @Permissions(...UPDATE)
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions(...DELETE)
  remove(@Param('id') id: string) {
    return this.rolesService.remove(id);
  }
}
