import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { LocationService } from 'src/location/location.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [ReportsController],
  providers: [ReportsService, LocationService, UsersService, JwtService],
})
export class ReportsModule { }
