import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import type { AuthUser } from '@chms/shared';
import { FollowUpStatus, FollowUpType } from '@prisma/client';
import { FollowUpService } from './followup.service';
import { FollowUpCampaignService } from './followup-campaign.service';
import {
  CreateFollowUpCampaignDto,
  CreateFollowUpDto,
  SendFollowUpMessageDto,
  UpdateFollowUpDto,
  UpdateFollowUpRecipientDto,
} from './dto/followup.dto';
import { Permissions } from '../common/decorators/permissions.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('follow-ups')
export class FollowUpController {
  constructor(
    private readonly followUp: FollowUpService,
    private readonly campaigns: FollowUpCampaignService,
  ) {}

  // ---- Campaigns (batch follow-ups) ----
  @Get('campaigns')
  @Permissions('membership.followup.view')
  listCampaigns(
    @Query('status') status?: FollowUpStatus,
    @Query('branchId') branchId?: string,
  ) {
    return this.campaigns.listCampaigns(status, branchId);
  }

  @Get('campaigns/candidates')
  @Permissions('membership.followup.view')
  candidates(
    @Query('type') type: FollowUpType,
    @Query('branchId') branchId: string,
  ) {
    return this.campaigns.getCandidates(type, branchId);
  }

  @Get('campaigns/assignees')
  @Permissions('membership.followup.create')
  assignees(@Query('branchId') branchId: string) {
    return this.campaigns.getAssignees(branchId);
  }

  @Post('campaigns')
  @Permissions('membership.followup.create')
  createCampaign(@Body() dto: CreateFollowUpCampaignDto, @CurrentUser() user: AuthUser) {
    return this.campaigns.createCampaign(dto, user.id);
  }

  @Get('campaigns/:id')
  @Permissions('membership.followup.view')
  getCampaign(@Param('id') id: string) {
    return this.campaigns.getCampaign(id);
  }

  @Delete('campaigns/:id')
  @Permissions('membership.followup.delete')
  removeCampaign(@Param('id') id: string) {
    return this.campaigns.removeCampaign(id);
  }

  @Get('campaigns/:id/recipients/:rid')
  @Permissions('membership.followup.view')
  getRecipient(@Param('id') id: string, @Param('rid') rid: string) {
    return this.campaigns.getRecipient(id, rid);
  }

  @Patch('campaigns/:id/recipients/:rid')
  @Permissions('membership.followup.update')
  updateRecipient(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: UpdateFollowUpRecipientDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaigns.updateRecipient(id, rid, dto, user.id);
  }

  @Post('campaigns/:id/recipients/:rid/send-sms')
  @Permissions('membership.followup.update')
  sendSms(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: SendFollowUpMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaigns.sendSms(id, rid, dto, user.id);
  }

  @Post('campaigns/:id/recipients/:rid/send-email')
  @Permissions('membership.followup.update')
  sendEmail(
    @Param('id') id: string,
    @Param('rid') rid: string,
    @Body() dto: SendFollowUpMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaigns.sendEmail(id, rid, dto, user.id);
  }

  @Get('member/:memberId/interactions')
  @Permissions('membership.followup.view')
  memberInteractions(@Param('memberId') memberId: string) {
    return this.campaigns.listInteractionsForMember(memberId);
  }

  @Post('member/:memberId/send-sms')
  @Permissions('membership.followup.update')
  sendMemberSms(
    @Param('memberId') memberId: string,
    @Body() dto: SendFollowUpMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaigns.sendMemberSms(memberId, dto, user.id);
  }

  @Post('member/:memberId/send-email')
  @Permissions('membership.followup.update')
  sendMemberEmail(
    @Param('memberId') memberId: string,
    @Body() dto: SendFollowUpMessageDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.campaigns.sendMemberEmail(memberId, dto, user.id);
  }

  @Get('member/:memberId')
  @Permissions('membership.followup.view')
  memberHistory(@Param('memberId') memberId: string) {
    return this.campaigns.listForMember(memberId);
  }

  // ---- Legacy single follow-ups ----
  @Get()
  @Permissions('membership.followup.view')
  list(
    @Query('status') status?: FollowUpStatus,
    @Query('branchId') branchId?: string,
    @Query('assignedToId') assignedToId?: string,
  ) {
    return this.followUp.list(status, branchId, assignedToId);
  }

  @Get('stats')
  @Permissions('membership.followup.view')
  stats(@Query('branchId') branchId?: string) {
    return this.followUp.stats(branchId);
  }

  @Get('legacy/:id')
  @Permissions('membership.followup.view')
  findOne(@Param('id') id: string) {
    return this.followUp.findOne(id);
  }

  @Post()
  @Permissions('membership.followup.create')
  create(@Body() dto: CreateFollowUpDto, @CurrentUser() user: AuthUser) {
    return this.followUp.create(dto, user.id);
  }

  @Patch('legacy/:id')
  @Permissions('membership.followup.update')
  update(@Param('id') id: string, @Body() dto: UpdateFollowUpDto) {
    return this.followUp.update(id, dto);
  }

  @Delete('legacy/:id')
  @Permissions('membership.followup.delete')
  remove(@Param('id') id: string) {
    return this.followUp.remove(id);
  }
}
