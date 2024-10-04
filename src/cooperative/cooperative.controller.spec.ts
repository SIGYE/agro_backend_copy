import { Test, TestingModule } from '@nestjs/testing';
import { CooperativeController } from './cooperative.controller';
import { CooperativeService } from './cooperative.service';

describe('CooperativeController', () => {
  let controller: CooperativeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CooperativeController],
      providers: [CooperativeService],
    }).compile();

    controller = module.get<CooperativeController>(CooperativeController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
