import { Module } from '@nestjs/common';
import { CooperativeService } from './cooperative.service';
import { CooperativeController } from './cooperative.controller';

@Module({
  controllers: [CooperativeController],
  providers: [CooperativeService],
})
export class CooperativeModule {}
