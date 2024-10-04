import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from 'src/users/users.service';
import { LocationService } from 'src/location/location.service';

@Module({
  controllers: [RolesController],
  providers: [RolesService, JwtService, UsersService, LocationService],
  exports: [RolesService]
})
export class RolesModule { }
