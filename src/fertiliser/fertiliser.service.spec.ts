import { Test, TestingModule } from '@nestjs/testing';
import { FertiliserService } from './fertiliser.service';

describe('FertiliserService', () => {
  let service: FertiliserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FertiliserService],
    }).compile();

    service = module.get<FertiliserService>(FertiliserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
