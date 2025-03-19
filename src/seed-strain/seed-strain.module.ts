import { Module } from '@nestjs/common';
import { SeedStrainService } from './seed-strain.service';
import { SeedStrainController } from './seed-strain.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';
@Module({
  controllers: [SeedStrainController],
  providers: [SeedStrainService, JwtService, Reflector, UsersService, LocationService],
})
export class SeedStrainModule { }
