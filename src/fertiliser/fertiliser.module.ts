import { Module } from '@nestjs/common';
import { FertiliserService } from './fertiliser.service';
import { FertiliserController } from './fertiliser.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [FertiliserController],
  providers: [FertiliserService, JwtService, Reflector, UsersService, LocationService],
})
export class FertiliserModule { }
