import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomBytes } from 'node:crypto';
import type { AuthUser } from '@chms/shared';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AppConfig } from '../config/configuration';
import { UpdateMeDto } from './dto/update-me.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService<AppConfig, true>,
    private readonly audit: AuditService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /** Loads an active user and flattens their roles + permissions. */
  async buildAuthUser(userId: string): Promise<AuthUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: { include: { permissions: { include: { permission: true } } } },
          },
        },
      },
    });

    if (!user || !user.isActive) return null;

    const roles = user.roles.map((ur) => ur.role.name);
    const permissions = Array.from(
      new Set(
        user.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.key),
        ),
      ),
    );

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      isSuperAdmin: user.isSuperAdmin,
      branchId: user.branchId,
      roles,
      permissions,
    };
  }

  async validateCredentials(email: string, password: string): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    return user.id;
  }

  private async issueTokens(
    userId: string,
    email: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<IssuedTokens> {
    const jwtCfg = this.config.get('jwt', { infer: true });

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: jwtCfg.accessSecret,
        expiresIn: jwtCfg.accessExpiresIn as unknown as number,
      },
    );

    const refreshToken = randomBytes(48).toString('hex');
    const refreshExpiresAt = this.computeRefreshExpiry(jwtCfg.refreshExpiresIn);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(refreshToken),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private computeRefreshExpiry(expiresIn: string): Date {
    // Supports formats like "7d", "24h", "30m"; defaults to 7 days.
    const match = /^(\d+)([smhd])$/.exec(expiresIn.trim());
    const now = Date.now();
    if (!match) return new Date(now + 7 * 24 * 60 * 60 * 1000);
    const value = parseInt(match[1], 10);
    const unitMs: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };
    return new Date(now + value * unitMs[match[2]]);
  }

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    const userId = await this.validateCredentials(email, password);
    const tokens = await this.issueTokens(userId, email, meta);

    const user = await this.buildAuthUser(userId);
    if (!user) throw new UnauthorizedException('Account is not active');

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.log({
      userId,
      action: 'auth.login',
      ipAddress: meta.ipAddress,
    });

    return { user, tokens };
  }

  async refresh(
    refreshToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ user: AuthUser; tokens: IssuedTokens }> {
    if (!refreshToken) throw new UnauthorizedException('Missing refresh token');

    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Rotate: revoke the used token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = await this.buildAuthUser(stored.userId);
    if (!user) throw new UnauthorizedException('Account is not active');

    const tokens = await this.issueTokens(user.id, user.email, meta);
    return { user, tokens };
  }

  async logout(refreshToken?: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = this.hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (stored) {
      await this.audit.log({
        userId: stored.userId,
        action: 'auth.logout',
      });
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatarUrl: true,
        isActive: true,
        isSuperAdmin: true,
        lastLoginAt: true,
        createdAt: true,
        branchId: true,
        branch: { select: { id: true, name: true, code: true } },
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: {
        id: true,
        employeeNumber: true,
        position: true,
        department: true,
        status: true,
        employmentType: true,
        hireDate: true,
        baseSalary: true,
        branch: { select: { id: true, name: true } },
      },
    });
    return {
      ...user,
      roles: user.roles.map((r) => r.role),
      employee: employee
        ? {
            ...employee,
            baseSalary: Number(employee.baseSalary),
          }
        : null,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto): Promise<AuthUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        avatarUrl: dto.avatarUrl,
      },
    });

    const authUser = await this.buildAuthUser(userId);
    if (!authUser) throw new UnauthorizedException('Account is not active');
    return authUser;
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ success: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const valid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await argon2.hash(dto.newPassword) },
    });

    return { success: true };
  }
}
