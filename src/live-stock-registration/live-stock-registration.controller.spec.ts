import { Test, TestingModule } from '@nestjs/testing';
import { LiveStockRegistrationController } from './live-stock-registration.controller';
import { LiveStockRegistrationService } from './live-stock-registration.service';

describe('LiveStockRegistrationController', () => {
  let controller: LiveStockRegistrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LiveStockRegistrationController],
      providers: [LiveStockRegistrationService],
    }).compile();

    controller = module.get<LiveStockRegistrationController>(LiveStockRegistrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
