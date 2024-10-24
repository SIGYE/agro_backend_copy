import { Test, TestingModule } from '@nestjs/testing';
import { DiseaseController } from './disease.controller';
import { DiseaseService } from './disease.service';

describe('DiseaseController', () => {
  let controller: DiseaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DiseaseController],
      providers: [DiseaseService],
    }).compile();

    controller = module.get<DiseaseController>(DiseaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
