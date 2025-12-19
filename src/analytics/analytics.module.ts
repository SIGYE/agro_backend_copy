import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { LocationService } from 'src/location/location.service';
import { FarmerService } from 'src/farmer/farmer.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, LocationService, FarmerService, UsersService, JwtService],
})
export class AnalyticsModule {}
