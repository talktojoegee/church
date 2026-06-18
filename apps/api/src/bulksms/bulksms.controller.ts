import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { BulkSmsService } from './bulksms.service';
import {
  PhoneGroupDto,
  PreviewBulkSmsDto,
  ScheduleBulkSmsDto,
  SendBulkSmsDto,
  SenderIdDto,
  UpdatePhoneGroupDto,
  VerifyWalletTopUpDto,
} from './dto/bulksms.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('bulksms')
export class BulkSmsController {
  constructor(private readonly bulkSms: BulkSmsService) {}

  // Wallet
  @Get('wallet') @Permissions('comms.bulksms.view')
  wallet(@Query('branchId') branchId?: string) {
    return this.bulkSms.walletSummary(branchId);
  }

  @Get('wallet/transactions') @Permissions('comms.bulksms.view')
  transactions(
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
  ) {
    return this.bulkSms.listTransactions(branchId, page ? Number(page) : 1);
  }

  @Post('wallet/verify') @Permissions('comms.bulksms.wallet')
  verifyTopUp(@Body() dto: VerifyWalletTopUpDto) {
    return this.bulkSms.verifyTopUp(dto);
  }

  @Get('wallet/paystack-charge') @Permissions('comms.bulksms.view')
  paystackCharge(@Query('amount') amount: string) {
    return this.bulkSms.getPaystackCharge(Number(amount));
  }

  // Phone groups
  @Get('phone-groups') @Permissions('comms.bulksms.view')
  listGroups(@Query('branchId') branchId?: string) {
    return this.bulkSms.listPhoneGroups(branchId);
  }

  @Post('phone-groups') @Permissions('comms.bulksms.manage')
  createGroup(@Body() dto: PhoneGroupDto, @CurrentUser() user: AuthUser) {
    return this.bulkSms.createPhoneGroup(dto, user.id);
  }

  @Patch('phone-groups/:id') @Permissions('comms.bulksms.manage')
  updateGroup(@Param('id') id: string, @Body() dto: UpdatePhoneGroupDto) {
    return this.bulkSms.updatePhoneGroup(id, dto);
  }

  @Delete('phone-groups/:id') @Permissions('comms.bulksms.manage')
  removeGroup(@Param('id') id: string) {
    return this.bulkSms.removePhoneGroup(id);
  }

  // Sender IDs
  @Get('sender-ids') @Permissions('comms.bulksms.view')
  listSenderIds(@Query('branchId') branchId?: string) {
    return this.bulkSms.listSenderIds(branchId);
  }

  @Post('sender-ids') @Permissions('comms.bulksms.manage')
  createSenderId(@Body() dto: SenderIdDto, @CurrentUser() user: AuthUser) {
    return this.bulkSms.createSenderId(dto, user.id);
  }

  @Post('sender-ids/:id/refresh') @Permissions('comms.bulksms.manage')
  refreshSenderId(@Param('id') id: string) {
    return this.bulkSms.refreshSenderId(id);
  }

  // Compose / send / history
  @Post('preview') @Permissions('comms.bulksms.send')
  preview(@Body() dto: PreviewBulkSmsDto) {
    return this.bulkSms.preview(dto);
  }

  @Post('send') @Permissions('comms.bulksms.send')
  send(@Body() dto: SendBulkSmsDto, @CurrentUser() user: AuthUser) {
    return this.bulkSms.send(dto, user.id);
  }

  @Post('schedule') @Permissions('comms.bulksms.send')
  schedule(@Body() dto: ScheduleBulkSmsDto, @CurrentUser() user: AuthUser) {
    return this.bulkSms.createSchedule(dto, user.id);
  }

  @Get('schedules') @Permissions('comms.bulksms.view')
  schedules(
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
  ) {
    return this.bulkSms.listSchedules(branchId, page ? Number(page) : 1);
  }

  @Get('schedules/:id') @Permissions('comms.bulksms.view')
  getSchedule(@Param('id') id: string) {
    return this.bulkSms.getSchedule(id);
  }

  @Post('schedules/:id/cancel') @Permissions('comms.bulksms.send')
  cancelSchedule(@Param('id') id: string) {
    return this.bulkSms.cancelSchedule(id);
  }

  @Get('history') @Permissions('comms.bulksms.view')
  history(
    @Query('branchId') branchId?: string,
    @Query('page') page?: string,
  ) {
    return this.bulkSms.listHistory(branchId, page ? Number(page) : 1);
  }

  @Get('history/:id') @Permissions('comms.bulksms.view')
  getMessage(@Param('id') id: string) {
    return this.bulkSms.getMessage(id);
  }
}
