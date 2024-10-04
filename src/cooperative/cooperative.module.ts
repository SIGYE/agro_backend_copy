import { Module } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CooperativeController } from './cooperative.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [CooperativeController],
  providers: [CooperativeService, JwtService, Reflector, UsersService, LocationService],
})
export class CooperativeModule { }
