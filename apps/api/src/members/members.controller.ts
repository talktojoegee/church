import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MembersService } from './members.service';
import {
  CreateLifeEventDto,
  CreateMemberDto,
  MemberQueryDto,
  UpdateMemberDto,
} from './dto/member.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @Permissions('membership.member.view')
  findMany(@Query() query: MemberQueryDto) {
    return this.membersService.findMany(query);
  }

  @Get('stats')
  @Permissions('membership.member.view')
  stats(@Query('branchId') branchId?: string) {
    return this.membersService.stats(branchId);
  }

  @Post('import')
  @Permissions('membership.member.create')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Body('branchId') branchId?: string,
  ) {
    if (!file?.buffer?.length) {
      return { created: 0, skipped: 0, errors: [{ row: 0, message: 'No file uploaded' }] };
    }
    const text = file.buffer.toString('utf-8');
    return this.membersService.importCsv(text, branchId || undefined);
  }

  @Get(':id')
  @Permissions('membership.member.view')
  findOne(@Param('id') id: string) {
    return this.membersService.findOne(id);
  }

  @Post()
  @Permissions('membership.member.create')
  create(@Body() dto: CreateMemberDto) {
    return this.membersService.create(dto);
  }

  @Patch(':id')
  @Permissions('membership.member.update')
  update(@Param('id') id: string, @Body() dto: UpdateMemberDto) {
    return this.membersService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('membership.member.delete')
  remove(@Param('id') id: string) {
    return this.membersService.remove(id);
  }

  @Post(':id/life-events')
  @Permissions('membership.member.update')
  addLifeEvent(@Param('id') id: string, @Body() dto: CreateLifeEventDto) {
    return this.membersService.addLifeEvent(id, dto);
  }

  @Delete(':id/life-events/:eventId')
  @Permissions('membership.member.update')
  removeLifeEvent(@Param('id') id: string, @Param('eventId') eventId: string) {
    return this.membersService.removeLifeEvent(id, eventId);
  }
}
