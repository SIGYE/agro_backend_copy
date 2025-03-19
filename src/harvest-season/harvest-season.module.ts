import { Module } from '@nestjs/common';
import { HarvestSeasonService } from './harvest-season.service';
import { HarvestSeasonController } from './harvest-season.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';
@Module({
  controllers: [HarvestSeasonController],
  providers: [HarvestSeasonService, JwtService, Reflector, UsersService, LocationService],
})
export class HarvestSeasonModule { }
