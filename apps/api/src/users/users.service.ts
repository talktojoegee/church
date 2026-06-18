import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto, paginate, skipTake } from '../common/pagination';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  isSuperAdmin: true,
  lastLoginAt: true,
  branchId: true,
  createdAt: true,
  branch: { select: { id: true, name: true, code: true } },
  roles: { select: { role: { select: { id: true, name: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private shape(user: any) {
    const { roles, ...rest } = user;
    return { ...rest, roles: roles.map((r: any) => r.role) };
  }

  async findMany(query: PaginationDto) {
    const { page = 1, pageSize = 20, search } = query;
    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { firstName: { contains: search } },
            { lastName: { contains: search } },
            { email: { contains: search } },
          ],
        }
      : {};

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: { createdAt: 'desc' },
        ...skipTake(page, pageSize),
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginate(rows.map((u) => this.shape(u)), total, page, pageSize);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException('User not found');
    return this.shape(user);
  }

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    await this.assertRolesExist(dto.roleIds);
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        branchId: dto.branchId,
        isActive: dto.isActive ?? true,
        roles: dto.roleIds?.length
          ? { create: dto.roleIds.map((roleId) => ({ roleId })) }
          : undefined,
      },
      select: userSelect,
    });
    return this.shape(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.assertRolesExist(dto.roleIds);

    const data: Prisma.UserUpdateInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      isActive: dto.isActive,
      ...(dto.branchId !== undefined
        ? dto.branchId
          ? { branch: { connect: { id: dto.branchId } } }
          : { branch: { disconnect: true } }
        : {}),
    };

    if (dto.password) {
      data.passwordHash = await argon2.hash(dto.password);
    }

    if (dto.roleIds) {
      await this.prisma.userRole.deleteMany({ where: { userId: id } });
      data.roles = { create: dto.roleIds.map((roleId) => ({ roleId })) };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: userSelect,
    });

    return this.shape(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    if (user.isSuperAdmin) {
      throw new BadRequestException('Cannot delete a super admin');
    }
    await this.prisma.user.delete({ where: { id } });
    return { success: true };
  }

  private async assertRolesExist(roleIds?: string[]) {
    if (!roleIds?.length) return;
    const count = await this.prisma.role.count({ where: { id: { in: roleIds } } });
    if (count !== roleIds.length) {
      throw new BadRequestException('One or more roles do not exist');
    }
  }
}
