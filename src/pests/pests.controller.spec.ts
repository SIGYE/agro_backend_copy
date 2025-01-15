import { Test, TestingModule } from '@nestjs/testing';
import { PestsController } from './pests.controller';
import { PestsService } from './pests.service';

describe('PestsController', () => {
  let controller: PestsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PestsController],
      providers: [PestsService],
    }).compile();

    controller = module.get<PestsController>(PestsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
