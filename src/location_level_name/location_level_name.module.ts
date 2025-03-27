import { Module } from '@nestjs/common';
import { LocationLevelNameService } from './location_level_name.service';
import { LocationLevelNameController } from './location_level_name.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';
@Module({
  controllers: [LocationLevelNameController],
  providers: [LocationLevelNameService, JwtService, Reflector, UsersService, LocationService],
})
export class LocationLevelNameModule { }
