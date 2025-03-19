import { Test, TestingModule } from '@nestjs/testing';
import { SeedStrainController } from './seed-strain.controller';
import { SeedStrainService } from './seed-strain.service';

describe('SeedStrainController', () => {
  let controller: SeedStrainController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SeedStrainController],
      providers: [SeedStrainService],
    }).compile();

    controller = module.get<SeedStrainController>(SeedStrainController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
