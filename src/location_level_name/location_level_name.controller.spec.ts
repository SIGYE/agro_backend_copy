import { Test, TestingModule } from '@nestjs/testing';
import { LocationLevelNameController } from './location_level_name.controller';
import { LocationLevelNameService } from './location_level_name.service';

describe('LocationLevelNameController', () => {
  let controller: LocationLevelNameController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationLevelNameController],
      providers: [LocationLevelNameService],
    }).compile();

    controller = module.get<LocationLevelNameController>(LocationLevelNameController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
