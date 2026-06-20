import { Module } from '@nestjs/common';
import { CommsService } from './comms.service';
import { MessagesController, TemplatesController } from './comms.controller';

@Module({
  controllers: [TemplatesController, MessagesController],
  providers: [CommsService],
  exports: [CommsService],
})
export class CommsModule {}
