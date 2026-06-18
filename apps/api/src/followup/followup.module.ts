import { Module } from '@nestjs/common';
import { FollowUpController } from './followup.controller';
import { FollowUpService } from './followup.service';
import { FollowUpCampaignService } from './followup-campaign.service';
import { FollowUpReminderService } from './followup-reminder.service';

@Module({
  controllers: [FollowUpController],
  providers: [FollowUpService, FollowUpCampaignService, FollowUpReminderService],
  exports: [FollowUpService, FollowUpCampaignService],
})
export class FollowUpModule {}
