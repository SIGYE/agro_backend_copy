import { Module } from '@nestjs/common';
import { LiveStockRegistrationService } from './live-stock-registration.service';
import { LiveStockRegistrationController } from './live-stock-registration.controller';

@Module({
  controllers: [LiveStockRegistrationController],
  providers: [LiveStockRegistrationService],
})
export class LiveStockRegistrationModule {}
