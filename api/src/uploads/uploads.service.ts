import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mkdirSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { AppConfig } from '../config/configuration';

const ALLOWED_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  '.mp3', '.mp4', '.wav', '.m4a', '.pdf',
  '.doc', '.docx',
]);

@Injectable()
export class UploadsService implements OnModuleInit {
  private readonly logger = new Logger(UploadsService.name);
  private uploadDir = './uploads';

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  onModuleInit() {
    this.uploadDir = this.config.get('upload', { infer: true }).dir;
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created upload directory: ${this.uploadDir}`);
    }
  }

  getDir(): string {
    return this.uploadDir;
  }

  validateFile(originalname: string, size: number): void {
    const ext = extname(originalname).toLowerCase();
    if (!ALLOWED_EXT.has(ext)) {
      throw new BadRequestException(`File type "${ext}" is not allowed`);
    }
    const maxBytes = this.config.get('upload', { infer: true }).maxMb * 1024 * 1024;
    if (size > maxBytes) {
      throw new BadRequestException(`File exceeds ${maxBytes / 1024 / 1024}MB limit`);
    }
  }

  buildFilename(originalname: string): string {
    return `${randomUUID()}${extname(originalname).toLowerCase()}`;
  }

  filePath(filename: string): string {
    return join(this.uploadDir, filename);
  }

  /** Public URL path (relative to API origin). */
  publicUrl(filename: string, apiPrefix: string): string {
    return `/${apiPrefix}/uploads/files/${filename}`;
  }
}
