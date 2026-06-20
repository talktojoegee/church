import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import type { Response } from 'express';
import { createReadStream, existsSync, mkdirSync } from 'node:fs';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { UploadsService } from './uploads.service';
import { Public } from '../common/decorators/public.decorator';
import type { AppConfig } from '../config/configuration';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.pdf': 'application/pdf',
};

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
mkdirSync(UPLOAD_DIR, { recursive: true });

@Controller('uploads')
export class UploadsController {
  constructor(
    private readonly uploads: UploadsService,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: UPLOAD_DIR,
        filename: (_req, file, cb) =>
          cb(null, `${randomUUID()}${extname(file.originalname).toLowerCase()}`),
      }),
      limits: { fileSize: parseInt(process.env.MAX_UPLOAD_MB ?? '50', 10) * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file uploaded');
    this.uploads.validateFile(file.originalname, file.size);
    const apiPrefix = this.config.get('apiPrefix', { infer: true });
    return {
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      url: this.uploads.publicUrl(file.filename, apiPrefix),
    };
  }

  @Public()
  @Get('files/:filename')
  serve(@Param('filename') filename: string, @Res() res: Response) {
    if (filename.includes('..') || filename.includes('/')) {
      return res.status(400).send('Invalid filename');
    }
    const path = this.uploads.filePath(filename);
    if (!existsSync(path)) return res.status(404).send('Not found');
    const mime = MIME_BY_EXT[extname(filename).toLowerCase()] ?? 'application/octet-stream';
    res.setHeader('Content-Type', mime);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return createReadStream(path).pipe(res);
  }
}
