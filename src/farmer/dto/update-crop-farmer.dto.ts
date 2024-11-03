import { PartialType } from '@nestjs/swagger';
import { cropFarmerDto } from './crop-farmer.dto';

export class UpdateCropFarmerDto extends PartialType(cropFarmerDto) { }