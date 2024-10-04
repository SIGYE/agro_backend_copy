import { PartialType } from '@nestjs/swagger';
import { CreateSlaughterHouseDto } from './create-slaughter-house.dto';

export class UpdateSlaughterHouseDto extends PartialType(CreateSlaughterHouseDto) {}
