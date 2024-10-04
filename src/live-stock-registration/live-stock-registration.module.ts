import { Module } from '@nestjs/common';
import { LiveStockRegistrationService } from './live-stock-registration.service';
import { LiveStockRegistrationController } from './live-stock-registration.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [LiveStockRegistrationController],
  providers: [LiveStockRegistrationService, JwtService, Reflector, UsersService, LocationService],
})
export class LiveStockRegistrationModule { }
