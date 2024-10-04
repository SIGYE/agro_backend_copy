import { Module } from '@nestjs/common';
import { SlaughterHouseService } from './slaughter-house.service';
import { SlaughterHouseController } from './slaughter-house.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [SlaughterHouseController],
  providers: [SlaughterHouseService, JwtService, Reflector, UsersService, LocationService],
})
export class SlaughterHouseModule { }
