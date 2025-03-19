import { PartialType } from '@nestjs/swagger';
import { CreateHarvestSeasonDto } from './create-harvest-season.dto';

export class UpdateHarvestSeasonDto extends PartialType(CreateHarvestSeasonDto) {}
