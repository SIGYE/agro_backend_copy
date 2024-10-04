import { Test, TestingModule } from '@nestjs/testing';
import { SlaughterHouseController } from './slaughter-house.controller';
import { SlaughterHouseService } from './slaughter-house.service';

describe('SlaughterHouseController', () => {
  let controller: SlaughterHouseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SlaughterHouseController],
      providers: [SlaughterHouseService],
    }).compile();

    controller = module.get<SlaughterHouseController>(SlaughterHouseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
