import { Test, TestingModule } from '@nestjs/testing';
import { SlaughterHouseService } from './slaughter-house.service';

describe('SlaughterHouseService', () => {
  let service: SlaughterHouseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlaughterHouseService],
    }).compile();

    service = module.get<SlaughterHouseService>(SlaughterHouseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
