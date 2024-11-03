import { PartialType } from '@nestjs/swagger';
import { animalFarmerDto } from './animal-famer.dto';

export class UpdateAnimalFarmerDto extends PartialType(animalFarmerDto) { }