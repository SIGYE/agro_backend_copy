import { Module } from '@nestjs/common';
import { MetricService } from './metric.service';
import { MetricController } from './metric.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';
@Module({
  controllers: [MetricController],
  providers: [MetricService, JwtService, Reflector, UsersService, LocationService],
})
export class MetricModule { }
