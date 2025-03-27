import { PartialType } from '@nestjs/swagger';
import { CreateLocationLevelNameDto } from './create-location_level_name.dto';

export class UpdateLocationLevelNameDto extends PartialType(CreateLocationLevelNameDto) {}
