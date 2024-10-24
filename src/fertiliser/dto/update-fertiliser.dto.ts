import { PartialType } from '@nestjs/swagger';
import { CreateFertiliserDto } from './create-fertiliser.dto';

export class UpdateFertiliserDto extends PartialType(CreateFertiliserDto) {}
