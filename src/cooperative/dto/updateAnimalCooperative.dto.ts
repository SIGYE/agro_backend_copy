import { PartialType } from '@nestjs/swagger';
import { CreateCooperativeDto } from './create-cooperative.dto';
import { animalCooperativeDto } from './animalCooperative.dto';

export class UpdateAnimalCooperativeDto extends PartialType(animalCooperativeDto) { }
