import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('branches')
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get()
  @Permissions('org.branch.view')
  findMany() {
    return this.branchesService.findMany();
  }

  @Get(':id/details')
  @Permissions('org.branch.view')
  details(@Param('id') id: string) {
    return this.branchesService.getDetails(id);
  }

  @Get(':id')
  @Permissions('org.branch.view')
  findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @Permissions('org.branch.create')
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(':id')
  @Permissions('org.branch.update')
  update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }

  @Delete(':id')
  @Permissions('org.branch.delete')
  remove(@Param('id') id: string) {
    return this.branchesService.remove(id);
  }
}
