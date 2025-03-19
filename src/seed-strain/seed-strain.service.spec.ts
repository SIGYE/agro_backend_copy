import { Test, TestingModule } from '@nestjs/testing';
import { SeedStrainService } from './seed-strain.service';

describe('SeedStrainService', () => {
  let service: SeedStrainService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SeedStrainService],
    }).compile();

    service = module.get<SeedStrainService>(SeedStrainService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
