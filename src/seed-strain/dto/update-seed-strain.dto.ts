import { PartialType } from '@nestjs/swagger';
import { CreateSeedStrainDto } from './create-seed-strain.dto';

export class UpdateSeedStrainDto extends PartialType(CreateSeedStrainDto) {}
