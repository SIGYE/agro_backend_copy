import { Test, TestingModule } from '@nestjs/testing';
import { FarmingActivityController } from './farming-activity.controller';
import { FarmingActivityService } from './farming-activity.service';

describe('FarmingActivityController', () => {
  let controller: FarmingActivityController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FarmingActivityController],
      providers: [FarmingActivityService],
    }).compile();

    controller = module.get<FarmingActivityController>(FarmingActivityController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
