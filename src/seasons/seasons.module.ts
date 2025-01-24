import { Module } from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { SeasonsController } from './seasons.controller';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [SeasonsController],
  providers: [SeasonsService, JwtService, Reflector, UsersService, LocationService],
})
export class SeasonsModule { }
