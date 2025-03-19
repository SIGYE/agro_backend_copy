import { Test, TestingModule } from '@nestjs/testing';
import { HarvestSeasonController } from './harvest-season.controller';
import { HarvestSeasonService } from './harvest-season.service';

describe('HarvestSeasonController', () => {
  let controller: HarvestSeasonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HarvestSeasonController],
      providers: [HarvestSeasonService],
    }).compile();

    controller = module.get<HarvestSeasonController>(HarvestSeasonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
