import { PartialType } from '@nestjs/swagger';
import { CreateFarmingActivityDto } from './create-farming-activity.dto';

export class UpdateFarmingActivityDto extends PartialType(CreateFarmingActivityDto) {}
