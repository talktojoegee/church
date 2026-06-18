import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private shape(role: any) {
    const { permissions, _count, users, ...rest } = role;
    return {
      ...rest,
      userCount: _count?.users ?? 0,
      permissionKeys: permissions?.map((p: any) => p.permission.key) ?? [],
    };
  }

  async findMany() {
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });
    return roles.map((r) => this.shape(r));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: { select: { key: true } } } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return this.shape(role);
  }

  /** All permissions grouped by module, for the role editor UI. */
  async listPermissions() {
    const perms = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { key: 'asc' }],
    });
    const grouped: Record<string, { key: string; description: string | null }[]> = {};
    for (const p of perms) {
      (grouped[p.module] ??= []).push({ key: p.key, description: p.description });
    }
    return grouped;
  }

  private async resolvePermissionIds(keys?: string[]): Promise<string[]> {
    if (!keys?.length) return [];
    const perms = await this.prisma.permission.findMany({
      where: { key: { in: keys } },
      select: { id: true },
    });
    if (perms.length !== new Set(keys).size) {
      throw new BadRequestException('One or more permissions are invalid');
    }
    return perms.map((p) => p.id);
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException('Role name already exists');

    const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        permissions: { create: permissionIds.map((permissionId) => ({ permissionId })) },
      },
    });
    return this.findOne(role.id);
  }

  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (dto.name && dto.name !== role.name) {
      if (role.isSystem) {
        throw new BadRequestException('System roles cannot be renamed');
      }
      const dup = await this.prisma.role.findUnique({ where: { name: dto.name } });
      if (dup) throw new ConflictException('Role name already exists');
    }

    if (dto.permissionKeys) {
      const permissionIds = await this.resolvePermissionIds(dto.permissionKeys);
      await this.prisma.rolePermission.deleteMany({ where: { roleId: id } });
      await this.prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
        skipDuplicates: true,
      });
    }

    await this.prisma.role.update({
      where: { id },
      data: {
        name: role.isSystem ? undefined : dto.name,
        description: dto.description,
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    if (role.isSystem) throw new BadRequestException('System roles cannot be deleted');
    if (role._count.users > 0) {
      throw new BadRequestException('Cannot delete a role still assigned to users');
    }
    await this.prisma.role.delete({ where: { id } });
    return { success: true };
  }
}
