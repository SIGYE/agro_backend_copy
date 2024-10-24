import { Test, TestingModule } from '@nestjs/testing';
import { FertiliserController } from './fertiliser.controller';
import { FertiliserService } from './fertiliser.service';

describe('FertiliserController', () => {
  let controller: FertiliserController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FertiliserController],
      providers: [FertiliserService],
    }).compile();

    controller = module.get<FertiliserController>(FertiliserController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
