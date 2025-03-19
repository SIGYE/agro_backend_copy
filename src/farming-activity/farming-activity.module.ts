import { Module } from '@nestjs/common';
import { FarmingActivityService } from './farming-activity.service';
import { FarmingActivityController } from './farming-activity.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [FarmingActivityController],
  providers: [FarmingActivityService, JwtService, Reflector, UsersService, LocationService],
})
export class FarmingActivityModule { }
