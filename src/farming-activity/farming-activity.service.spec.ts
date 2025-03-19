import { Test, TestingModule } from '@nestjs/testing';
import { FarmingActivityService } from './farming-activity.service';

describe('FarmingActivityService', () => {
  let service: FarmingActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FarmingActivityService],
    }).compile();

    service = module.get<FarmingActivityService>(FarmingActivityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
