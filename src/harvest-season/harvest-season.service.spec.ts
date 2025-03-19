import { Test, TestingModule } from '@nestjs/testing';
import { HarvestSeasonService } from './harvest-season.service';

describe('HarvestSeasonService', () => {
  let service: HarvestSeasonService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HarvestSeasonService],
    }).compile();

    service = module.get<HarvestSeasonService>(HarvestSeasonService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
