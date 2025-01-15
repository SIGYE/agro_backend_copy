import { Test, TestingModule } from '@nestjs/testing';
import { PestsService } from './pests.service';

describe('PestsService', () => {
  let service: PestsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PestsService],
    }).compile();

    service = module.get<PestsService>(PestsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
