import { Module } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [LocationService],
  controllers: [LocationController],
  imports : [DatabaseModule],
  exports : [LocationService]
})
export class LocationModule {}
