import { Test, TestingModule } from '@nestjs/testing';
import { LiveStockRegistrationService } from './live-stock-registration.service';

describe('LiveStockRegistrationService', () => {
  let service: LiveStockRegistrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LiveStockRegistrationService],
    }).compile();

    service = module.get<LiveStockRegistrationService>(LiveStockRegistrationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
