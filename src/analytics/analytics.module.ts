import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { LocationService } from 'src/location/location.service';
import { FarmerService } from 'src/farmer/farmer.service';
import { UsersService } from 'src/users/users.service';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LocationService, FarmerService, UsersService],
})
export class AnalyticsModule {}
