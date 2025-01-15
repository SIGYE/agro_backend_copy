import { Module } from '@nestjs/common';
import { PestsService } from './pests.service';
import { PestsController } from './pests.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [PestsController],
  providers: [PestsService, JwtService, Reflector, UsersService, LocationService],
})
export class PestsModule { }
