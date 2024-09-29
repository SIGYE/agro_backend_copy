import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  providers: [SettingsService],
  controllers: [SettingsController],
  imports : [DatabaseModule]
})
export class SettingsModule {}
