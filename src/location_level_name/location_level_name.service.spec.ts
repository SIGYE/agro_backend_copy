import { Test, TestingModule } from '@nestjs/testing';
import { LocationLevelNameService } from './location_level_name.service';

describe('LocationLevelNameService', () => {
  let service: LocationLevelNameService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationLevelNameService],
    }).compile();

    service = module.get<LocationLevelNameService>(LocationLevelNameService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
