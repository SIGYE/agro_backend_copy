import { Module } from '@nestjs/common';
import { FarmingActivityService } from './farming-activity.service';
import { FarmingActivityController } from './farming-activity.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';
import { MedicineController } from './medicine.controller';
import { VaccineController } from './vaccine.controller';
import { MedicineService } from './medicine.service';
import { VaccineService } from './vaccine.service';

@Module({
  controllers: [FarmingActivityController, MedicineController, VaccineController],
  providers: [FarmingActivityService, JwtService, Reflector, UsersService, LocationService, MedicineService, VaccineService],
})
export class FarmingActivityModule { }
