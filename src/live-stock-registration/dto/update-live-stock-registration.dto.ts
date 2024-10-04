import { PartialType } from '@nestjs/swagger';
import { CreateLiveStockRegistrationDto } from './create-live-stock-registration.dto';

export class UpdateLiveStockRegistrationDto extends PartialType(CreateLiveStockRegistrationDto) {}
