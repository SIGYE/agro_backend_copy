import { Module } from '@nestjs/common';
import { ProduceService } from './produce.service';
import { ProduceController } from './produce.controller';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [ProduceController],
  providers: [ProduceService, JwtService, Reflector, UsersService, LocationService],
})
export class ProduceModule { }
