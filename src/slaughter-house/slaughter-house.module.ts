import { Module } from '@nestjs/common';
import { SlaughterHouseService } from './slaughter-house.service';
import { SlaughterHouseController } from './slaughter-house.controller';

@Module({
  controllers: [SlaughterHouseController],
  providers: [SlaughterHouseService],
})
export class SlaughterHouseModule {}
