import { Module } from '@nestjs/common';
import { ContentService } from './content.service';
import {
  EventsController,
  OutreachesController,
  OutreachTypesController,
  SermonSeriesController,
  SermonsController,
  TestimoniesController,
  TestimonyCategoriesController,
} from './content.controller';

@Module({
  controllers: [
    SermonsController,
    SermonSeriesController,
    TestimoniesController,
    TestimonyCategoriesController,
    EventsController,
    OutreachesController,
    OutreachTypesController,
  ],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
