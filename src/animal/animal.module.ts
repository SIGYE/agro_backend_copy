import { Module } from '@nestjs/common';
import { AnimalService } from './animal.service';
import { AnimalController } from './animal.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [AnimalController],
  providers: [AnimalService, JwtService, Reflector, UsersService, LocationService],
})
export class AnimalModule { }
