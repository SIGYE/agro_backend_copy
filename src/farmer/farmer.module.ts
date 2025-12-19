import { Module } from '@nestjs/common';
import { FarmerService } from './farmer.service';
import { FarmerController } from './farmer.controller';
import { LocationService } from 'src/location/location.service';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { NotificationModule } from 'src/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [FarmerController],
  providers: [FarmerService, JwtService, Reflector, UsersService, LocationService],
})
export class FarmerModule { }
