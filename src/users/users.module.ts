import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { MailModule } from 'src/mail/mail.module';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, JwtService, Reflector, LocationService],
  exports: [UsersService]
})
export class UsersModule { }
